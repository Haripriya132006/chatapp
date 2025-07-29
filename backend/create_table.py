from db import engine
from models import SQLModel,Message,ChatRequest,User

SQLModel.metadata.create_all(engine)