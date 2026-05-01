from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel): 
    email: EmailStr 
    password: str

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    fname: str
    lname: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    fname: str
    lname: str
    role: str
