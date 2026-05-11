import json, os
from dotenv import load_dotenv
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models import User
from app.email.send_email import gmail_send_message
import bcrypt

load_dotenv()

DEFAULT_MESSAGE_PATH = (
    Path(__file__).resolve().parents[1]
    / "email"
    / "messages"
    / "default-messages.json"
)
SYSTEM_EMAIL = os.getenv('EMAIL')


class DuplicateEmailError(ValueError):
    pass


class PasswordValidationError(ValueError):
    pass


class UserEmailDeliveryError(RuntimeError):
    pass


def normalize_account_role(role: str) -> str:
    normalized_role = role.strip().lower()
    return "instructor" if normalized_role == "user" else normalized_role


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_initial_email_template(lang: str) -> dict:
    message_key = "initialEmailES" if lang.strip().lower().startswith("es") else "initialEmailEN"

    with DEFAULT_MESSAGE_PATH.open(encoding="utf-8") as message_file:
        messages = json.load(message_file)

    return messages.get(message_key) or messages["initialEmailEN"]


def render_template(template: str, values: dict[str, str]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", value)
    return rendered


def send_initial_user_email(user: User, password: str, lang: str = "en"):
    template = get_initial_email_template(lang)
    template_values = {
        "firstName": user.fname,
        "fullName": f"{user.fname} {user.lname}".strip(),
        "email": user.email,
        "password": password,
    }
    subject = render_template(template["subject"], template_values)
    body = render_template(template["text"], template_values)
    html_body = render_template(template["html"], template_values)

    try:
        sent_message = gmail_send_message(
            sender=SYSTEM_EMAIL,
            recipients=user.email,
            subject=subject,
            body=body,
            classlist="Academic Admin",
            prof="Academic Admin",
            html_body=html_body,
            use_bcc=False,
        )
    except Exception as exc:
        raise UserEmailDeliveryError(
            f"Instructor was not created because the welcome email was not sent to {user.email}: {exc}"
        ) from exc

    if not sent_message:
        raise UserEmailDeliveryError(
            f"Instructor was not created because Gmail returned no message for {user.email}"
        )


def validate_password_requirements(password: str):
    if len(password) < 6:
        raise PasswordValidationError("Password must be at least 6 characters long")
    if not any(char.isupper() for char in password):
        raise PasswordValidationError(
            "Password must include at least one uppercase letter"
        )
    if not any(char.islower() for char in password):
        raise PasswordValidationError(
            "Password must include at least one lowercase letter"
        )
    if not any(char.isdigit() for char in password):
        raise PasswordValidationError("Password must include at least one number")


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
    lang: str = "en",
):
    normalized_email = normalize_email(email)
    if get_user_by_email(db, normalized_email):
        raise DuplicateEmailError("An instructor with that email already exists")

    validate_password_requirements(password)

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    user = User(
        email=normalized_email,
        password_hash=password_hash,
        fname=fname.strip(),
        lname=lname.strip(),
        role=normalize_account_role(role),
    )
    db.add(user)
    try:
        db.flush()
        send_initial_user_email(user, password, lang)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateEmailError("An instructor with that email already exists") from exc
    except UserEmailDeliveryError:
        db.rollback()
        raise
    db.refresh(user)
    return user


def delete_user_by_id(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    db.delete(user)
    db.commit()
    return user

def change_password(db: Session, user_id: int, password: str):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    validate_password_requirements(password)

    new_password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    user.password_hash = new_password_hash
    db.commit()
    db.refresh(user)
    return user
    
    
