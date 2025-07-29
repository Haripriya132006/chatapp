from sqlmodel import SQLModel,create_engine,Session
DB_URL = "postgresql://postgres:vanihari123@db.qyvutnzcczunupmukaej.supabase.co:6543/postgres"
engine = create_engine(DB_URL, echo=True, pool_pre_ping=True, connect_args={"sslmode": "require"})

def get_session():
    with Session(engine) as session:
        yield session
