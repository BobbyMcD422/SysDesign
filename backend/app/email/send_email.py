import base64
import os.path
from pathlib import Path
from collections.abc import Sequence
from email.message import EmailMessage

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete token.json and authorize again.
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
EMAIL_DIR = Path(__file__).resolve().parent


def first_existing_path(*paths: Path) -> Path | None:
  for path in paths:
    if path.exists():
      return path
  return None


def has_required_scopes(creds):
  """Return whether the saved token can send Gmail messages."""
  if not creds:
    return False
  if hasattr(creds, "has_scopes"):
    return creds.has_scopes(SCOPES)
  return set(SCOPES).issubset(set(creds.scopes or []))


def get_credentials():
  """Load or create OAuth credentials for the Gmail API."""
  creds = None
  token_path = first_existing_path(Path("token.json"), EMAIL_DIR / "token.json")
  credentials_path = first_existing_path(
      Path("credentials.json"), EMAIL_DIR / "credentials.json"
  )

  if token_path:
    creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

  if not creds or not creds.valid or not has_required_scopes(creds):
    if creds and creds.expired and creds.refresh_token:
      try:
        creds.refresh(Request())
      except RefreshError:
        creds = None

    if not creds or not creds.valid or not has_required_scopes(creds):
      if not credentials_path:
        raise FileNotFoundError(
            "Missing Gmail OAuth credentials file. Place credentials.json in "
            "backend/ or backend/app/email/."
        )
      flow = InstalledAppFlow.from_client_secrets_file(
          str(credentials_path), SCOPES
      )
      creds = flow.run_local_server(port=0)

    token_write_path = token_path or EMAIL_DIR / "token.json"
    with token_write_path.open("w", encoding="utf-8") as token:
      token.write(creds.to_json())

  return creds


def normalize_recipients(recipients: str | Sequence[str]) -> list[str]:
  """Return recipients as a clean list of email addresses."""
  if isinstance(recipients, str):
    recipients = [recipients]

  return [recipient.strip() for recipient in recipients if recipient.strip()]


def gmail_send_message(sender: str,
                       recipients: str | Sequence[str],
                       subject: str,
                       body: str,
                       classlist: str,
                       prof: str,
                       html_body: str | None = None,
                       use_bcc: bool = True):
  """Create and send an email message."""
  creds = get_credentials()
  recipient_list = normalize_recipients(recipients)
  if not recipient_list:
    raise ValueError("At least one recipient is required.")

  service = build("gmail", "v1", credentials=creds)
  message = EmailMessage()

  message.set_content(body)
  if html_body:
    message.add_alternative(html_body, subtype="html")

  if use_bcc:
    message["To"] = f"{classlist}<{sender}>"
    message["Bcc"] = ", ".join(recipient_list)
  else:
    message["To"] = ", ".join(recipient_list)

  message["From"] = f"{prof}<{sender}>"
  message["Subject"] = subject

  # encoded message
  encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

  create_message = {"raw": encoded_message}
  # pylint: disable=E1101
  send_message = (
      service.users()
      .messages()
      .send(userId="me", body=create_message)
      .execute()
  )
  print(f'Message Id: {send_message["id"]}')
  return send_message
