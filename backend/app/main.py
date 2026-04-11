import re, bcrypt
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.routes.auth_router import auth_router

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

app.include_router(auth_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "API is running"}