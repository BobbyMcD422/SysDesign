from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CreateEmailRequest
from auth.services.auth_service import get_current_active_user
from app.models import User
from app.email.send_email import gmail_send_message

email_router = APIRouter(
    prefix="/email",
    tags=["Email"],
)

@email_router.post("/send-email", status_code=status.HTTP_201_CREATED)
def send_email(
    payload: CreateEmailRequest,
    current_user: User = Depends(get_current_active_user),
):
    try:
        if payload.prof is None:
            prof = f"Instructor {current_user.lname}"
        else:
            prof = payload.prof
        gmail_send_message(
            sender="meta.api.testing.group5@gmail.com",
            recipients=payload.recipients,
            subject=payload.subject,
            body=payload.body,
            classlist=payload.classlist,
            prof=prof,
        )
    except:
        return None

@email_router.get("/get-user-emails")
def check_mail(
    current_user: User = Depends(get_current_active_user),
):
    ...