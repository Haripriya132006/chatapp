# test_insert_user.py
from db import get_session
from models import User

# Create a new user using the Pydantic model
user = User(
    username="harry",
    password="secret12",
    security_question="1",
    security_answer="1" 
)

# Use the MongoDB session to insert the user
for db in get_session():
    db["users"].insert_one(user.model_dump())

print("User added.")
