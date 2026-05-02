from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import User
import bcrypt


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == normalize_email(email)).first()

def verify_password(plain_pass: str, hashed_pass: str) -> bool:
    try: 
        return bcrypt.checkpw(plain_pass.encode("utf-8"), hashed_pass.encode("utf-8"))
    except ValueError:
        return False
    
def get_all_users(db: Session):
    return db.query(User).all()


def create_user(
    db: Session,
    email: str,
    password: str,
    fname: str,
    lname: str,
    role: str,
):
    normalized_email = normalize_email(email)
    if get_user_by_email(db, normalized_email):
        raise ValueError("A user with that email already exists")

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    user = User(
        email=normalized_email,
        password_hash=password_hash,
        fname=fname.strip(),
        lname=lname.strip(),
        role=role.strip().lower(),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("A user with that email already exists") from exc
    db.refresh(user)
    return user


def delete_user_by_id(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    db.delete(user)
    db.commit()
    return user
