from sqlmodel import SQLModel,create_engine,Session
DB_URL = "postgresql://postgres:vanihari123@db.qyvutnzcczunupmukaej.supabase.co:5432/postgres"
engine=create_engine(DB_URL,echo=True)

def get_session():
    with Session(engine) as session:
        yield session
