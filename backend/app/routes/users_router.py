import csv
import io
import json
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import File, UploadFile
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.helper_functions.user_functions import (
    DuplicateEmailError,
    PasswordValidationError,
    UserEmailDeliveryError,
    create_user,
    change_password,
    delete_user_by_id,
    get_all_users,
    get_user_by_email,
    normalize_email,
)
from app.models import User
from app.schemas import (
    BulkCreateUsersResponse,
    BulkUserError,
    ChangePasswordRequest,
    CreateUserRequest,
    UserResponse,
)
from auth.services.auth_service import require_admin, get_current_active_user

users_router = APIRouter(
    prefix="/users",
    tags=["Users"],
)

REQUIRED_BULK_USER_FIELDS = {"fname", "lname", "email", "password", "role"}


def clean_bulk_value(value: object) -> str:
    text = str(value or "").strip()
    return "".join(
        character
        for character in text
        if unicodedata.category(character) != "Cf"
    )


@users_router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return get_all_users(db)


@users_router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def add_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing_user = get_user_by_email(db, normalize_email(payload.email))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists",
        )

    try:
        return create_user(
            db,
            email=payload.email,
            password=payload.password,
            fname=payload.fname,
            lname=payload.lname,
            role=payload.role,
            lang=payload.lang,
        )
    except DuplicateEmailError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except PasswordValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except UserEmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


def parse_bulk_user_file(filename: str, contents: bytes) -> list[dict]:
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("File must be UTF-8 encoded") from exc

    if filename.lower().endswith(".json"):
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("users")
        if not isinstance(data, list):
            raise ValueError("JSON file must contain a list of users")
        return data

    if filename.lower().endswith(".csv"):
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise ValueError("CSV file must include a header row")

        normalized_headers = {
            field.strip().lower() for field in reader.fieldnames if field
        }
        missing_fields = REQUIRED_BULK_USER_FIELDS - normalized_headers
        if missing_fields:
            raise ValueError(
                f"CSV file is missing required columns: {', '.join(sorted(missing_fields))}"
            )

        return [
            {
                clean_bulk_value(key).lower(): clean_bulk_value(value)
                for key, value in row.items()
            }
            for row in reader
        ]

    raise ValueError("Upload a .csv or .json file")


@users_router.post("/bulk-upload", response_model=BulkCreateUsersResponse)
async def bulk_upload_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        rows = parse_bulk_user_file(file.filename or "", await file.read())
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    created_users: list[User] = []
    errors: list[BulkUserError] = []

    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(
                BulkUserError(
                    row=index,
                    email=None,
                    error="Each row must be an object with user fields",
                )
            )
            continue

        row = {
            clean_bulk_value(key).lower(): clean_bulk_value(value)
            for key, value in row.items()
        }

        if all(row.get(field) == field for field in REQUIRED_BULK_USER_FIELDS):
            continue

        try:
            payload = CreateUserRequest(
                email=str(row.get("email", "")),
                password=str(row.get("password", "")),
                fname=str(row.get("fname", "")),
                lname=str(row.get("lname", "")),
                role=str(row.get("role", "user") or "user"),
                lang=str(row.get("lang", "en") or "en"),
            )
            created_users.append(
                create_user(
                    db,
                    email=payload.email,
                    password=payload.password,
                    fname=payload.fname,
                    lname=payload.lname,
                    role=payload.role,
                    lang=payload.lang,
                )
            )
        except ValidationError as exc:
            errors.append(
                BulkUserError(
                    row=index,
                    email=str(row.get("email", "")) or None,
                    error=exc.errors()[0]["msg"],
                )
            )
        except (DuplicateEmailError, PasswordValidationError, UserEmailDeliveryError) as exc:
            errors.append(
                BulkUserError(
                    row=index,
                    email=str(row.get("email", "")) or None,
                    error=str(exc),
                )
            )

    return BulkCreateUsersResponse(created=created_users, errors=errors)


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    deleted_user = delete_user_by_id(db, user_id)
    if not deleted_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return None

@users_router.post("/change-pass")
def change_pw(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        updated_user = change_password(db, current_user.id, payload.password)
    except PasswordValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {"ok": True}
