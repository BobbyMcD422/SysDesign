import base64
from pathlib import Path
from collections.abc import Sequence
from email.message import EmailMessage
from typing import Any

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete token.json and authorize again.
SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
]
EMAIL_DIR = Path(__file__).resolve().parent


def first_existing_path(*paths: Path) -> Path | None:
  for path in paths:
    if path.exists():
      return path
  return None


def get_token_path() -> Path | None:
  """Return the first saved Gmail token path, if present."""
  return first_existing_path(Path("token.json"), EMAIL_DIR / "token.json")


def get_credentials_path() -> Path | None:
  """Return the first Gmail OAuth client credentials path, if present."""
  return first_existing_path(Path("credentials.json"), EMAIL_DIR / "credentials.json")


def has_required_scopes(creds):
  """Return whether the saved token can use the configured Gmail scopes."""
  if not creds:
    return False
  if hasattr(creds, "has_scopes"):
    return creds.has_scopes(SCOPES)
  return set(SCOPES).issubset(set(creds.scopes or []))


def get_credentials():
  """Load or create OAuth credentials for the Gmail API."""
  creds = None
  token_path = get_token_path()
  credentials_path = get_credentials_path()

  if token_path:
    creds = Credentials.from_authorized_user_file(str(token_path))

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


def generate_gmail_token() -> dict[str, Any]:
  """Create or refresh token.json using the configured Gmail API scopes."""
  creds = None
  token_path = get_token_path()
  credentials_path = get_credentials_path()

  # token.json stores access and refresh tokens after the first OAuth flow.
  if token_path:
    creds = Credentials.from_authorized_user_file(str(token_path))

  if not creds or not creds.valid or not has_required_scopes(creds):
    if creds and creds.expired and creds.refresh_token and has_required_scopes(creds):
      creds.refresh(Request())
    else:
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

  return serialize_gmail_token_status(creds)


def serialize_gmail_token_status(creds=None) -> dict[str, Any]:
  """Return connector-safe information about the saved Gmail OAuth token."""
  token_path = get_token_path()
  credentials_path = get_credentials_path()

  if creds is None and token_path:
    creds = Credentials.from_authorized_user_file(str(token_path))

  expiry = getattr(creds, "expiry", None) if creds else None
  return {
    "token_path": str(token_path) if token_path else None,
    "credentials_path": str(credentials_path) if credentials_path else None,
    "has_token": token_path is not None,
    "has_credentials": credentials_path is not None,
    "valid": bool(creds and creds.valid),
    "expired": bool(creds and creds.expired),
    "has_refresh_token": bool(creds and creds.refresh_token),
    "has_required_scopes": has_required_scopes(creds),
    "scopes": list(creds.scopes or []) if creds else [],
    "expiry": expiry.isoformat() if expiry else None,
  }


def get_gmail_token_status() -> dict[str, Any]:
  """Return current Gmail token status without refreshing it."""
  return serialize_gmail_token_status()


def refresh_gmail_token() -> dict[str, Any]:
  """Refresh the saved Gmail access token using the saved refresh token."""
  token_path = get_token_path()
  if not token_path:
    raise FileNotFoundError("Missing Gmail token.json.")

  creds = Credentials.from_authorized_user_file(str(token_path))
  if not creds.refresh_token:
    raise RefreshError("Saved Gmail token does not include a refresh token.")
  if not has_required_scopes(creds):
    raise RefreshError(
        "Saved Gmail token does not include the required Gmail scopes. "
        "Delete token.json and complete OAuth consent again."
    )

  creds.refresh(Request())
  with token_path.open("w", encoding="utf-8") as token:
    token.write(creds.to_json())

  return serialize_gmail_token_status(creds)


def get_gmail_service():
  """Build an authenticated Gmail API client."""
  return build("gmail", "v1", credentials=get_credentials())


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
  recipient_list = normalize_recipients(recipients)
  if not recipient_list:
    raise ValueError("At least one recipient is required.")

  service = get_gmail_service()
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


def build_gmail_query(
    query: str | None = None,
    sender: str | None = None,
    recipient: str | None = None,
) -> str:
  """Build a Gmail search query from optional filters."""
  query_parts: list[str] = []

  if query:
    query_parts.append(query.strip())
  if sender:
    query_parts.append(f"from:{sender.strip()}")
  if recipient:
    query_parts.append(f"to:{recipient.strip()}")

  return " ".join(query_parts)


def get_header(headers: list[dict[str, str]], name: str) -> str | None:
  """Return a Gmail message header value by case-insensitive name."""
  for header in headers:
    if header.get("name", "").lower() == name.lower():
      return header.get("value")
  return None


def decode_base64_urlsafe(data: str | None) -> str:
  """Decode Gmail's URL-safe base64 payload text."""
  if not data:
    return ""

  padded_data = data + "=" * (-len(data) % 4)
  decoded = base64.urlsafe_b64decode(padded_data.encode("utf-8"))
  return decoded.decode("utf-8", errors="replace")


def find_message_body(payload: dict[str, Any]) -> str | None:
  """Return the first plain-text body found in a Gmail message payload."""
  mime_type = payload.get("mimeType")
  body_data = payload.get("body", {}).get("data")

  if mime_type == "text/plain" and body_data:
    return decode_base64_urlsafe(body_data)

  for part in payload.get("parts", []) or []:
    body = find_message_body(part)
    if body:
      return body

  if body_data:
    return decode_base64_urlsafe(body_data)

  return None


def summarize_gmail_message(message: dict[str, Any]) -> dict[str, Any]:
  """Convert Gmail API message data into a small API response shape."""
  payload = message.get("payload", {})
  headers = payload.get("headers", []) or []

  return {
    "id": message.get("id"),
    "thread_id": message.get("threadId"),
    "label_ids": message.get("labelIds", []),
    "snippet": message.get("snippet"),
    "from_email": get_header(headers, "From"),
    "to": get_header(headers, "To"),
    "cc": get_header(headers, "Cc"),
    "bcc": get_header(headers, "Bcc"),
    "subject": get_header(headers, "Subject"),
    "date": get_header(headers, "Date"),
    "internal_date": message.get("internalDate"),
    "body": find_message_body(payload),
  }


def gmail_list_messages(
    query: str | None = None,
    sender: str | None = None,
    recipient: str | None = None,
    max_results: int = 10,
    include_body: bool = False,
):
  """Return Gmail messages matching optional search filters."""
  service = get_gmail_service()
  gmail_query = build_gmail_query(query=query, sender=sender, recipient=recipient)

  response = (
      service.users()
      .messages()
      .list(userId="me", q=gmail_query or None, maxResults=max_results)
      .execute()
  )

  messages = response.get("messages", [])
  format_type = "full" if include_body else "metadata"
  metadata_headers = ["From", "To", "Subject", "Date"]
  results = []

  for message in messages:
    get_kwargs = {
        "userId": "me",
        "id": message["id"],
        "format": format_type,
    }
    if not include_body:
      get_kwargs["metadataHeaders"] = metadata_headers

    request = (
        service.users()
        .messages()
        .get(**get_kwargs)
    )
    results.append(summarize_gmail_message(request.execute()))

  return {
    "messages": results,
    "next_page_token": response.get("nextPageToken"),
    "result_size_estimate": response.get("resultSizeEstimate", 0),
  }


def gmail_get_message(message_id: str):
  """Return one Gmail message by ID."""
  service = get_gmail_service()
  message = (
      service.users()
      .messages()
      .get(userId="me", id=message_id, format="full")
      .execute()
  )
  return summarize_gmail_message(message)


def gmail_modify_message_labels(
    message_id: str,
    add_label_ids: list[str] | None = None,
    remove_label_ids: list[str] | None = None,
):
  """Add or remove labels on one Gmail message."""
  service = get_gmail_service()
  return (
      service.users()
      .messages()
      .modify(
          userId="me",
          id=message_id,
          body={
              "addLabelIds": add_label_ids or [],
              "removeLabelIds": remove_label_ids or [],
          },
      )
      .execute()
  )


def gmail_trash_message(message_id: str):
  """Move one Gmail message to trash."""
  service = get_gmail_service()
  return (
      service.users()
      .messages()
      .trash(userId="me", id=message_id)
      .execute()
  )

if __name__ == "__main__":
    generate_gmail_token()