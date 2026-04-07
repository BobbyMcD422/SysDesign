import re
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
# DB Stuff
from .database import Base, SessionLocal, engine
from .models import User
from .schemas import LoginRequest
from email_validator import validate_email, EmailNotValidError
from sqlalchemy.orm import Session

def has_uppercase(s):
    """Returns True if the string contains at least one uppercase letter."""
    return bool(re.search(r'[A-Z]', s))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "API is running"}

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Define Vars
    emailIsValid = False
    passIsValid = False

    # Validate Login Info
    try:
        v = validate_email(data.email.lower())
        validEmail = v.normalized
        emailIsValid = True
    except EmailNotValidError:
        raise HTTPException(status_code=401, detail="Email is invalid")
    
    validPass = data.password.strip()
    if len(validPass) >= 6 and has_uppercase(validPass): 
        passIsValid = True
    else:
        raise HTTPException(status_code=401, detail="Password doesn't meet formatting requirements")

    # Get Info
    if emailIsValid and passIsValid:
        user = db.query(User).filter(User.email == validEmail).first()
        if not user:
            raise HTTPException(status_code=401, detail=f"Invalid email or password {validPass} {validEmail}")

        return {"ok": True, "message": "Login request received"}
