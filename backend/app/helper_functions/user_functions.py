from sqlalchemy.orm import Session
from app.models import User
import bcrypt

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

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
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    user = User(
        email=email.strip().lower(),
        password_hash=password_hash,
        fname=fname.strip(),
        lname=lname.strip(),
        role=role.strip().lower(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user_by_id(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    db.delete(user)
    db.commit()
    return user
