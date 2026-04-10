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