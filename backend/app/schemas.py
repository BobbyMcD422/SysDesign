from pydantic import BaseModel, EmailStr, Field
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

class StudentCreate(BaseModel):
    fname: str
    lname: str
    email: EmailStr

class StudentResponse(BaseModel):
    student_id: int
    fname: str
    lname: str
    email: EmailStr

class BulkStudentError(BaseModel):
    row: int
    email: str | None = None
    error: str

class ClassCreate(BaseModel):
    name: str
    term: str

class ClassResponse(BaseModel):
    class_id: int
    name: str
    term: str

class BulkClassError(BaseModel):
    row: int
    name: str | None = None
    error: str

class BulkCreateClassesResponse(BaseModel):
    created: list[ClassResponse]
    errors: list[BulkClassError]

class StudentClassResponse(BaseModel):
    class_id: int
    name: str
    term: str

class StudentWithClassesResponse(StudentResponse):
    classes: list[StudentClassResponse] = Field(default_factory=list)

class BulkCreateStudentsResponse(BaseModel):
    created: list[StudentWithClassesResponse]
    errors: list[BulkStudentError]

class InstructorAssignmentRequest(BaseModel):
    instructor_id: int

class EnrollmentRequest(BaseModel):
    student_id: int

class BulkUserError(BaseModel):
    row: int
    email: str | None = None
    error: str

class BulkCreateUsersResponse(BaseModel):
    created: list[UserResponse]
    errors: list[BulkUserError]

class CreateEmailRequest(BaseModel):
    recipients: EmailStr | list[EmailStr] = Field(default_factory=list)
    subject: str
    body: str
    html_body: str | None = None
    class_id: int | None = None
    classlist: str | None = None
    prof: str | None

class GmailMessageResponse(BaseModel):
    id: str
    thread_id: str | None = None
    label_ids: list[str] = Field(default_factory=list)
    snippet: str | None = None
    from_email: str | None = None
    to: str | None = None
    cc: str | None = None
    bcc: str | None = None
    subject: str | None = None
    date: str | None = None
    internal_date: str | None = None
    body: str | None = None

class GmailMessageListResponse(BaseModel):
    messages: list[GmailMessageResponse]
    next_page_token: str | None = None
    result_size_estimate: int = 0

class GmailTokenStatusResponse(BaseModel):
    token_path: str | None = None
    credentials_path: str | None = None
    has_token: bool
    has_credentials: bool
    valid: bool
    expired: bool
    has_refresh_token: bool
    has_required_scopes: bool
    scopes: list[str] = Field(default_factory=list)
    expiry: str | None = None
