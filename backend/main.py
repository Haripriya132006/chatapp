from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from db import get_session
from models import User, Message, ChatRequest
from typing import Dict
from pydantic import BaseModel
from datetime import datetime
import bcrypt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: Dict[str, WebSocket] = {}


def hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_value(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


@app.websocket("/ws/{username}")
async def chat_ws(websocket: WebSocket, username: str):
    await websocket.accept()
    active_connections[username] = websocket

    for db in get_session():
        messages = list(db["messages"].find({"to_user": username, "delivered": False}))
        for msg in messages:
            msg["_id"] = str(msg["_id"])  # Fix ObjectId
            await websocket.send_json(msg)
            db["messages"].update_one({"_id": msg["_id"]}, {"$set": {"delivered": True}})

    try:
        while True:
            data = await websocket.receive_json()
            message = {
                "from_user": username,
                "to_user": data["to"],
                "text": data["text"],
                "timestamp": datetime.utcnow().isoformat(),
                "delivered": False
            }

            for db in get_session():
                db["messages"].insert_one(message)

            if data["to"] in active_connections:
                await active_connections[data["to"]].send_json(message)
                message["delivered"] = True
                for db in get_session():
                    db["messages"].update_one(
                        {"from_user": username, "to_user": data["to"], "timestamp": message["timestamp"]},
                        {"$set": {"delivered": True}}
                    )

    except WebSocketDisconnect:
        del active_connections[username]


@app.get("/")
def root():
    return {"status": "ChatApp API is running"}


@app.get("/history/{user1}/{user2}")
def det_history(user1: str, user2: str):
    for db in get_session():
        messages = list(db["messages"].find({
            "$or": [
                {"from_user": user1, "to_user": user2},
                {"from_user": user2, "to_user": user1}
            ]
        }).sort("timestamp"))

        # Remove or convert _id from each message
        for msg in messages:
            msg["_id"] = str(msg["_id"])  # Or: del msg["_id"]

        return messages



class ChatRequestBody(BaseModel):
    from_user: str
    to_user: str


@app.post("/request-chat")
def request_chat(data: ChatRequestBody):
    request = data.model_dump()
    request["status"] = "pending"
    for db in get_session():
        db["chatrequests"].insert_one(request)
    return {"msg": "Request sent"}


from bson import ObjectId  # At the top if not already

class PendingRequest(BaseModel):
    from_user: str
    to_user: str
    status: str

@app.get("/pending-requests/{username}")
def get_requests(username: str):
    db = get_session()
    return {"meaw":db["chat_requests"]}
    # return {db["chat_requests"]}
    # requests = db["chatrequests"].find({"to_user": username, "status": "pending"})
    
    # result = []
    # for r in requests:
        # result.append(PendingRequest(
            # from_user=r["from_user"],
            # to_user=r["to_user"],
            # status=r["status"]
        # ))
    
    # return result

class AcceptRequestBody(BaseModel):
    from_user: str
    to_user: str


@app.post("/accept-chat")
def accept_chat(data: AcceptRequestBody):
    for db in get_session():
        result = db["chatrequests"].update_one(
            {"from_user": data.from_user, "to_user": data.to_user, "status": "pending"},
            {"$set": {"status": "accepted"}}
        )
        if result.modified_count:
            return {"msg": "Chat accepted"}
        else:
            return {"error": "No such request"}


class UpdateStatusBody(BaseModel):
    from_user: str
    to_user: str
    new_status: str


@app.post("/update-status")
def update_status(data: UpdateStatusBody):
    for db in get_session():
        result = db["chatrequests"].update_one(
            {"$or": [
                {"from_user": data.from_user, "to_user": data.to_user},
                {"from_user": data.to_user, "to_user": data.from_user}
            ]},
            {"$set": {"status": data.new_status}}
        )
        if result.modified_count:
            return {"msg": f"Status updated to '{data.new_status}'"}
        raise HTTPException(status_code=404, detail="No existing chat relationship")


@app.get("/users")
def get_users():
    for db in get_session():
        return list(db["users"].find({}, {"_id": 0}))


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/login")
def login(data: LoginRequest):
    for db in get_session():
        user = db["users"].find_one({"username": data.username})
        if not user or not verify_value(data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"message": "Login successful", "username": user["username"]}


class SignupRequest(BaseModel):
    username: str
    password: str
    question: str
    answer: str


@app.post("/signup")
def signup(data: SignupRequest):
    for db in get_session():
        existing = db["users"].find_one({"username": data.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")

        user = {
            "username": data.username,
            "password": hash(data.password),
            "security_question": data.question,
            "security_answer": hash(data.answer)
        }
        db["users"].insert_one(user)
        return {"msg": "User created successfully"}


class Recovery(BaseModel):
    username: str
    answer: str
    new_password: str


@app.get("/recovery-question/{username}")
def get_security_question(username: str):
    for db in get_session():
        user = db["users"].find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"question": user["security_question"]}


@app.post("/reset-password")
def reset_password(data: Recovery):
    for db in get_session():
        user = db["users"].find_one({"username": data.username})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_value(data.answer, user["security_answer"]):
            raise HTTPException(status_code=401, detail="Incorrect answer")

        if data.new_password == "TEMP":
            return {"msg": "Answer verified"}

        db["users"].update_one(
            {"username": data.username},
            {"$set": {"password": hash(data.new_password)}}
        )
        return {"msg": "Password reset successful"}


class RejectRequestBody(BaseModel):
    from_user: str
    to_user: str


@app.post("/reject-chat")
def reject_chat(data: RejectRequestBody):
    for db in get_session():
        result = db["chatrequests"].delete_one({
            "from_user": data.from_user,
            "to_user": data.to_user,
            "status": "pending"
        })
        if result.deleted_count:
            return {"msg": "Request rejected and removed"}
        raise HTTPException(status_code=404, detail="Request not found")


@app.get("/allowed-users/{username}")
def get_allowed_users(username: str):
    for db in get_session():
        requests = db["chatrequests"].find({
            "$or": [
                {"from_user": username},
                {"to_user": username}
            ]
        })
        results = []
        for r in requests:
            other_user = r["to_user"] if r["from_user"] == username else r["from_user"]
            results.append({"user": other_user, "status": r["status"]})
        return results
