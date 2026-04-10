from fastapi import APIRouter, Depends, HTTPException, Response, status
from typing import Annotated
from datetime import timedelta
from app.database import get_db
from sqlalchemy.orm import Session
from auth.services.auth_service import (
    COOKIE_NAME,
    authenticate_user,
    create_access_token,
    get_current_active_user,
)
from fastapi.security import OAuth2PasswordRequestForm
from app.models import User

auth_router = APIRouter(
    prefix='/auth',
    tags=['Auth'],
)

@auth_router.post('/login')
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
                        detail="Invalid email or password", 
                        headers={"WWW-Authenticate": "Bearer"},
                    )
    access_token_expires = timedelta(minutes=1440) # Do * # of Days (default is 1 day)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=int(access_token_expires.total_seconds()),
        path="/",
    )

    return {
        "ok": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
        },
    }


@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@auth_router.get("/me")
async def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
    }
