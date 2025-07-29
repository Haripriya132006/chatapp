from typing import Optional
from sqlmodel import Field,SQLModel
from datetime import datetime,timezone

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    password: str
    security_question:str
    security_answer:str

class Message(SQLModel,table=True):
    id:Optional[int]=Field(default=None,primary_key=True)
    from_user:str
    to_user: str
    text : str
    delivered :bool=False
    timestamp: datetime=Field(default_factory=datetime.utcnow)

class ChatRequest(SQLModel,table=True):
    id:Optional[int]=Field(default=None,primary_key=True)
    from_user:str
    to_user: str
    status :str="pending"

