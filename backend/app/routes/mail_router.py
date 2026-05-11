from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.auth.exceptions import RefreshError
from googleapiclient.errors import HttpError
from pydantic import EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    CreateEmailRequest,
    GmailMessageListResponse,
    GmailMessageResponse,
    GmailTokenStatusResponse,
    ReplyEmailRequest,
)
from auth.services.auth_service import get_current_active_user, require_admin
from app.models import ClassGroup, User
from app.email.send_email import (
    gmail_get_message,
    gmail_list_messages,
    gmail_modify_message_labels,
    gmail_reply_message,
    gmail_send_message,
    gmail_trash_message,
    generate_gmail_token,
    get_gmail_token_status,
    refresh_gmail_token,
)

email_router = APIRouter(
    prefix="/email",
    tags=["Email"],
)

SYSTEM_EMAIL = "meta.api.testing.group5@gmail.com"


def is_admin(user: User) -> bool:
    return user.role.lower() == "admin"


def user_display_name(user: User) -> str:
    return f"{user.fname} {user.lname}".strip()


def normalized(value: str | None) -> str:
    return (value or "").strip().lower()


def message_text(*values: str | None) -> str:
    return " ".join(normalized(value) for value in values if value)


def user_mail_query(user: User) -> str:
    display_name = user_display_name(user)
    return (
        f'{{from:"{display_name}" to:"{display_name}" from:{user.email} to:{user.email}}}'
    )


def user_can_access_message(user: User, message: dict) -> bool:
    if is_admin(user):
        return True

    display_name = normalized(user_display_name(user))
    user_email = normalized(user.email)
    system_email = normalized(SYSTEM_EMAIL)
    from_header = normalized(message.get("from_email"))
    recipient_headers = message_text(
        message.get("to"),
        message.get("cc"),
        message.get("bcc"),
    )
    all_headers = message_text(from_header, recipient_headers)

    sent_by_user = display_name in from_header and system_email in from_header
    received_by_user = user_email in recipient_headers
    reply_to_user_alias = display_name in recipient_headers and system_email in recipient_headers

    return (
        sent_by_user
        or received_by_user
        or reply_to_user_alias
        or user_email in all_headers
    )


def filter_accessible_messages(user: User, response: dict) -> dict:
    if is_admin(user):
        return response

    messages = [
        message
        for message in response.get("messages", [])
        if user_can_access_message(user, message)
    ]
    return {
        **response,
        "messages": messages,
        "result_size_estimate": len(messages),
    }


def class_label(class_group: ClassGroup) -> str:
    return f"{class_group.name} ({class_group.term})"


def get_payload_recipients(payload: CreateEmailRequest) -> list[str]:
    if isinstance(payload.recipients, str):
        return [payload.recipients]
    return [str(recipient) for recipient in payload.recipients]


def dedupe_recipients(recipients: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []

    for recipient in recipients:
        clean_recipient = recipient.strip()
        normalized_recipient = clean_recipient.lower()
        if not clean_recipient or normalized_recipient in seen:
            continue

        seen.add(normalized_recipient)
        deduped.append(clean_recipient)

    return deduped


def instructor_teaches_class(user: User, class_group: ClassGroup) -> bool:
    return any(
        assignment.instructor_id == user.id
        for assignment in class_group.instructors
    )


def get_class_mailing_list(
    db: Session,
    class_id: int,
    current_user: User,
) -> tuple[str, list[str]]:
    class_group = db.get(ClassGroup, class_id)
    if not class_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found",
        )

    if not is_admin(current_user) and not instructor_teaches_class(current_user, class_group):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only email classes assigned to you",
        )

    recipients = [
        enrollment.student.email
        for enrollment in class_group.enrollments
    ]
    recipients.extend(
        assignment.instructor.email
        for assignment in class_group.instructors
    )

    return class_label(class_group), dedupe_recipients(recipients)


@email_router.post("/send-email", status_code=status.HTTP_201_CREATED)
def send_email(
    payload: CreateEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    recipients = get_payload_recipients(payload)
    classlist = payload.classlist or "Academic Admin"

    if not is_admin(current_user) and payload.class_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Choose one of your assigned classes before sending email",
        )

    if not is_admin(current_user) and recipients:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructors can only email assigned class lists",
        )

    if payload.class_id is not None:
        classlist, class_recipients = get_class_mailing_list(
            db,
            payload.class_id,
            current_user,
        )
        recipients.extend(class_recipients)

    recipients = dedupe_recipients(recipients)
    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one recipient or choose a class with students or teachers",
        )

    try:
        if is_admin(current_user):
            prof = payload.prof or user_display_name(current_user)
        else:
            prof = user_display_name(current_user)
        gmail_send_message(
            sender=SYSTEM_EMAIL,
            recipients=recipients,
            subject=payload.subject,
            body=payload.body,
            classlist=classlist,
            prof=prof,
            html_body=payload.html_body,
        )
    except HttpError as exc:
        raise map_gmail_error(exc) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Email was not sent: {exc}",
        ) from exc

    return {"ok": True}

def map_gmail_error(exc: HttpError) -> HTTPException:
    status_code = getattr(exc.resp, "status", status.HTTP_502_BAD_GATEWAY)
    if status_code == status.HTTP_403_FORBIDDEN:
        detail = (
            "Gmail access was denied. Reauthorize token.json with Gmail read "
            "scope if this token was created before message reads were added."
        )
    elif status_code == status.HTTP_404_NOT_FOUND:
        detail = "Gmail message not found"
    else:
        detail = "Gmail API request failed"

    return HTTPException(status_code=status_code, detail=detail)


def map_token_refresh_error(exc: Exception) -> HTTPException:
    if isinstance(exc, FileNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"{exc} If the refresh token is expired, revoked, or missing new "
            "Gmail scopes, delete token.json and complete OAuth consent again."
        ),
    )


@email_router.get("/token/status", response_model=GmailTokenStatusResponse)
def get_token_status(
    current_user: User = Depends(require_admin),
):
    return get_gmail_token_status()


@email_router.post("/token/refresh", response_model=GmailTokenStatusResponse)
def refresh_token(
    current_user: User = Depends(require_admin),
):
    try:
        return refresh_gmail_token()
    except (FileNotFoundError, RefreshError) as exc:
        raise map_token_refresh_error(exc) from exc


@email_router.post("/token/generate", response_model=GmailTokenStatusResponse)
def generate_token(
    current_user: User = Depends(require_admin),
):
    try:
        return generate_gmail_token()
    except (FileNotFoundError, RefreshError) as exc:
        raise map_token_refresh_error(exc) from exc


@email_router.get("/messages", response_model=GmailMessageListResponse)
def get_messages(
    q: str | None = Query(default=None, description="Optional raw Gmail search query."),
    sender: EmailStr | None = Query(default=None, description="Filter by sender email."),
    recipient: EmailStr | None = Query(default=None, description="Filter by recipient email."),
    max_results: int = Query(default=10, ge=1, le=50),
    include_body: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
):
    try:
        if is_admin(current_user):
            response = gmail_list_messages(
                query=q,
                sender=str(sender) if sender else None,
                recipient=str(recipient) if recipient else None,
                max_results=max_results,
                include_body=include_body,
            )
        else:
            access_query = user_mail_query(current_user)
            response = gmail_list_messages(
                query=f"{access_query} {q}".strip() if q else access_query,
                max_results=max_results,
                include_body=True,
            )
        return filter_accessible_messages(current_user, response)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc


@email_router.get("/messages/me", response_model=GmailMessageListResponse)
def check_mail(
    max_results: int = Query(default=10, ge=1, le=50),
    include_body: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
):
    try:
        response = gmail_list_messages(
            query=user_mail_query(current_user) if not is_admin(current_user) else None,
            recipient=current_user.email if is_admin(current_user) else None,
            max_results=max_results,
            include_body=True if not is_admin(current_user) else include_body,
        )
        return filter_accessible_messages(current_user, response)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc


@email_router.get("/messages/from/{sender_email}", response_model=GmailMessageListResponse)
def get_messages_from_sender(
    sender_email: EmailStr,
    max_results: int = Query(default=10, ge=1, le=50),
    include_body: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
):
    if not is_admin(current_user) and normalized(sender_email) != normalized(current_user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view that sender's messages",
        )

    try:
        response = gmail_list_messages(
            sender=str(sender_email) if is_admin(current_user) else None,
            query=user_mail_query(current_user) if not is_admin(current_user) else None,
            max_results=max_results,
            include_body=True if not is_admin(current_user) else include_body,
        )
        return filter_accessible_messages(current_user, response)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc


@email_router.get("/messages/{message_id}", response_model=GmailMessageResponse)
def get_message(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    try:
        message = gmail_get_message(message_id)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    if not user_can_access_message(current_user, message):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this message",
        )

    return message


def get_authorized_message(message_id: str, current_user: User) -> dict:
    try:
        message = gmail_get_message(message_id)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    if not user_can_access_message(current_user, message):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage this message",
        )

    return message


@email_router.post("/messages/{message_id}/read")
def mark_message_read(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    get_authorized_message(message_id, current_user)
    try:
        gmail_modify_message_labels(message_id, remove_label_ids=["UNREAD"])
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    return {"ok": True}


@email_router.post("/messages/{message_id}/reply", status_code=status.HTTP_201_CREATED)
def reply_to_message(
    message_id: str,
    payload: ReplyEmailRequest,
    current_user: User = Depends(get_current_active_user),
):
    original_message = get_authorized_message(message_id, current_user)

    try:
        gmail_reply_message(
            original_message=original_message,
            sender=SYSTEM_EMAIL,
            prof=user_display_name(current_user),
            body=payload.body,
            html_body=payload.html_body,
        )
    except HttpError as exc:
        raise map_gmail_error(exc) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Reply was not sent: {exc}",
        ) from exc

    return {"ok": True}


@email_router.post("/messages/{message_id}/unread")
def mark_message_unread(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    get_authorized_message(message_id, current_user)
    try:
        gmail_modify_message_labels(message_id, add_label_ids=["UNREAD"])
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    return {"ok": True}


@email_router.post("/messages/{message_id}/star")
def star_message(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    get_authorized_message(message_id, current_user)
    try:
        gmail_modify_message_labels(message_id, add_label_ids=["STARRED"])
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    return {"ok": True}


@email_router.post("/messages/{message_id}/unstar")
def unstar_message(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    get_authorized_message(message_id, current_user)
    try:
        gmail_modify_message_labels(message_id, remove_label_ids=["STARRED"])
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    return {"ok": True}


@email_router.post("/messages/{message_id}/archive")
def archive_message(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    get_authorized_message(message_id, current_user)
    try:
        gmail_modify_message_labels(message_id, remove_label_ids=["INBOX"])
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    return {"ok": True}


@email_router.post("/messages/{message_id}/trash")
def trash_message(
    message_id: str,
    current_user: User = Depends(get_current_active_user),
):
    get_authorized_message(message_id, current_user)
    try:
        gmail_trash_message(message_id)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc

    return {"ok": True}


@email_router.get("/get-user-emails", response_model=GmailMessageListResponse)
def get_user_emails(
    max_results: int = Query(default=10, ge=1, le=50),
    include_body: bool = Query(default=False),
    current_user: User = Depends(get_current_active_user),
):
    try:
        response = gmail_list_messages(
            query=user_mail_query(current_user) if not is_admin(current_user) else None,
            recipient=current_user.email if is_admin(current_user) else None,
            max_results=max_results,
            include_body=True if not is_admin(current_user) else include_body,
        )
        return filter_accessible_messages(current_user, response)
    except HttpError as exc:
        raise map_gmail_error(exc) from exc
