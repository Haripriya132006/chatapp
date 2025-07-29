from fastapi import FastAPI,WebSocket,WebSocketDisconnect,HTTPException,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session,select
from db import get_session,engine
from models import Message,SQLModel,ChatRequest,User
from typing import Dict
from pydantic import BaseModel

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

active_connections:Dict[str,WebSocket]={}

import bcrypt

def hash(plain:str)->str:
    return bcrypt.hashpw(plain.encode('utf-8'),bcrypt.gensalt()).decode('utf-8')

def verify_value(plain:str,hashed:str)->bool:
    return bcrypt.checkpw(plain.encode('utf-8'),hashed.encode('utf-8'))


@app.websocket("/ws/{username}")
async def chat_ws(websocket:WebSocket,username:str,session:Session=Depends(get_session)):
    await websocket.accept()
    active_connections[username]=websocket

    stmt=select(Message).where(Message.to_user==username,Message.delivered==False)
    messages=session.exec(stmt).all()

    for msg in messages:
        await websocket.send_json({
            "from":msg.from_user,
            "to":msg.to_user,
            "text":msg.text,
            "timestamp":str(msg.timestamp)
        })
        msg.delivered=True
    session.commit()

    try:
        while True:
            data=await websocket.receive_json()
            message=Message(
                from_user=username,
                to_user=data["to"],
                text=data["text"]
            )

            session.add(message)
            session.commit()
            session.refresh(message)

            if data["to"] in active_connections:
                await active_connections[data["to"]].send_json({
                    "from":username,
                    "to":data["to"],
                    "text":data["text"],
                    "timestamp":str(message.timestamp)
                })

                message.delivered=True
                session.commit()

    except WebSocketDisconnect:
        del active_connections[username]

@app.get("/history/{user1}/{user2}")
def det_history(user1:str,user2:str,session:Session=Depends(get_session)):
    stmt=select(Message).where(
        ((Message.from_user == user1) & (Message.to_user==user2))|
        ((Message.from_user == user2) & (Message.to_user == user1))
    ).order_by(Message.timestamp)
    return session.exec(stmt).all()


class ChatRequestBody(BaseModel):
    from_user: str
    to_user: str

@app.post("/request-chat")
def request_chat(data: ChatRequestBody, session: Session = Depends(get_session)):
    request = ChatRequest(from_user=data.from_user, to_user=data.to_user)
    session.add(request)
    session.commit()
    return {"msg": "Request sent"}


@app.get("/pending-requests/{username}")
def get_requests(username:str,session:Session=Depends(get_session)):
    stmt=select(ChatRequest).where(ChatRequest.to_user==username,ChatRequest.status=="pending")
    return session.exec(stmt).all()

class AcceptRequestBody(BaseModel):
    from_user: str
    to_user: str

@app.post("/accept-chat")
def accept_chat(data: AcceptRequestBody, session: Session = Depends(get_session)):
    stmt = select(ChatRequest).where(
        ChatRequest.from_user == data.from_user,
        ChatRequest.to_user == data.to_user,
        ChatRequest.status == "pending"
    )

    request = session.exec(stmt).first()
    if not request:
        return {"error": "No such request"}
    
    request.status = "accepted"
    session.commit()
    return {"msg": "Chat accepted"}



class UpdateStatusBody(BaseModel):
    from_user: str
    to_user: str
    new_status: str

@app.post("/update-status")
def update_status(data: UpdateStatusBody, session: Session = Depends(get_session)):
    stmt = select(ChatRequest).where(
        ((ChatRequest.from_user == data.from_user) & (ChatRequest.to_user == data.to_user)) |
        ((ChatRequest.from_user == data.to_user) & (ChatRequest.to_user == data.from_user))
    )
    request = session.exec(stmt).first()
    if not request:
        raise HTTPException(status_code=404, detail="No existing chat relationship")

    request.status = data.new_status
    session.commit()
    return {"msg": f"Status updated to '{data.new_status}'"}


@app.get("/users")
def get_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return users


class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
def login(data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(
        select(User).where(User.username == data.username)
    ).first()

    if not user or not verify_value(data.password,user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"message": "Login successful", "username": user.username}

class signupRequest(BaseModel):
    username:str
    password:str
    question:str
    answer:str

@app.post("/signup")
def signin(data:signupRequest,session:Session=Depends(get_session)):
    existing=session.exec(select(User).where (User.username==data.username)).first()
    if existing:
        raise HTTPException(status_code=400,detail="username already exists")
    
    user=User(username=data.username,
              password=hash(data.password),
              security_question=data.question,
              security_answer=hash(data.answer)
              )
    
    session.add(user)
    session.commit()
    return {"msg":"user created successfully"}

class Recovery(BaseModel):
    username:str
    answer:str
    new_password:str

@app.get("/recovery-question/{username}")
def get_security_question(username:str,session:Session=Depends(get_session)):
    user=session.exec(select(User).where(User.username==username)).first()
    if not user:
        raise HTTPException(status_code=404,detail="user not found")
    return {"question":user.security_question}

@app.post("/reset-password")
def reset_password(data: Recovery, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == data.username)).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify answer
    if not verify_value(data.answer, user.security_answer):
        raise HTTPException(status_code=401, detail="Incorrect answer")

    # Just verify answer? (TEMP is a flag)
    if data.new_password == "TEMP":
        return {"msg": "Answer verified"}

    # Actually reset the password
    user.password = hash(data.new_password)
    session.commit()
    return {"msg": "Password reset successful"}


class RejectRequestBody(BaseModel):
    from_user: str
    to_user: str

@app.post("/reject-chat")
def reject_chat(data: RejectRequestBody, session: Session = Depends(get_session)):
    stmt = select(ChatRequest).where(
        (ChatRequest.from_user == data.from_user) &
        (ChatRequest.to_user == data.to_user) &
        (ChatRequest.status == "pending")
    )
    request = session.exec(stmt).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    session.delete(request)
    session.commit()
    return {"msg": "Request rejected and removed"}

@app.get("/allowed-users/{username}")
def get_allowed_users(username: str, session: Session = Depends(get_session)):
    stmt = select(ChatRequest).where(
        ((ChatRequest.from_user == username) | (ChatRequest.to_user == username))
    )
    requests = session.exec(stmt).all()
    
    results = []
    for r in requests:
        other_user = r.to_user if r.from_user == username else r.from_user
        results.append({"user": other_user, "status": r.status})
    
    return results