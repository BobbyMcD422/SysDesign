from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.helper_functions.user_functions import (
    create_user,
    delete_user_by_id,
    get_all_users,
    get_user_by_email,
)
from app.models import User
from app.schemas import CreateUserRequest, UserResponse
from auth.services.auth_service import require_admin

users_router = APIRouter(
    prefix="/users",
    tags=["Users"],
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
    existing_user = get_user_by_email(db, payload.email.strip().lower())
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email already exists",
        )

    return create_user(
        db,
        email=payload.email,
        password=payload.password,
        fname=payload.fname,
        lname=payload.lname,
        role=payload.role,
    )


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
