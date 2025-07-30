from pymongo import MongoClient

# Your MongoDB connection string
DB_URL = "mongodb+srv://meaw:meaw@database.eca1wnf.mongodb.net/?retryWrites=true&w=majority"

def get_session():
    client = MongoClient(DB_URL)
    db = client["chatapp"]  # Your database name inside the cluster
    try:
        yield db
    finally:
        client.close()
