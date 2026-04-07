import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()

db_pass = os.getenv('db_pass')
db_owner = os.getenv('db_owner')
db_name = os.getenv('db_name')
db_host = os.getenv('db_host', 'localhost')
db_port = os.getenv('db_port', '5434')

DATABASE_URL = f"postgresql+psycopg://{db_owner}:{db_pass}@{db_host}:{db_port}/{db_name}"

class Base(DeclarativeBase):
    pass

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)