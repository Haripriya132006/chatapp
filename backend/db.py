from pymongo import MongoClient
import certifi

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("pass.env")  # specify your env file path

DB_URL = os.getenv("DB_URL")
def get_session():
    client = MongoClient(DB_URL, tlsCAFile=certifi.where())  # <- use certifi CA file
    db = client["chatapp"]
    try:
        yield db
    finally:
        client.close()
