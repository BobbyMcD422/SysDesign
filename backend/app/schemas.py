from pydantic import BaseModel, EmailStr
from collections.abc import Sequence

class LoginRequest(BaseModel): 
    email: EmailStr 
    password: str

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    fname: str
    lname: str
    role: str
    lang: str = "en"

class ChangePasswordRequest(BaseModel):
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    fname: str
    lname: str
    role: str

class BulkUserError(BaseModel):
    row: int
    email: str | None = None
    error: str

class BulkCreateUsersResponse(BaseModel):
    created: list[UserResponse]
    errors: list[BulkUserError]

class CreateEmailRequest(BaseModel):
    recipients: EmailStr | Sequence[str]
    subject: str
    body: str
    classlist: str
    prof: str | None
