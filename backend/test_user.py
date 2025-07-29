# test_insert_user.py
from db import engine
from sqlmodel import Session
from models import User

with Session(engine) as session:
    user = User(username="harry", password="secret12")
    session.add(user)
    session.commit()

print("User added.")