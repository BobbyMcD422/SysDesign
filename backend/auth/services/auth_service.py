from dotenv import load_dotenv
from auth.models.token import TokenData
from app.database import get_db
from app.models import User
from fastapi import Depends, HTTPException, Request, status
from app.helper_functions.user_functions import get_user_by_email, verify_password
from sqlalchemy.orm import Session
import os, jwt
from jwt.exceptions import InvalidTokenError
from datetime import timedelta, datetime, timezone

load_dotenv()

SECRET_KEY = os.getenv("AUTH_KEY")
ALGORITHM = "HS256"

COOKIE_NAME = "access_token"


def authenticate_user(email: str, password: str, db: Session):
    user = get_user_by_email(db, email.strip().lower())
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()

    # Set Expiration Times for Tokens
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15) 
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise ValueError("Token missing subject")
        return TokenData(email=email)
    except InvalidTokenError as exc:
        raise ValueError("Invalid token") from exc


async def get_current_user(request: Request, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise credentials_exception

    try:
        token_data = decode_access_token(token)
    except ValueError:
        raise credentials_exception

    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user


async def require_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
    return current_user
