# models.py
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class User(BaseModel):
    username: str
    password: str
    security_question: str
    security_answer: str

class Message(BaseModel):
    from_user: str
    to_user: str
    text: str
    delivered: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    from_user: str
    to_user: str
    status: str = "pending"
