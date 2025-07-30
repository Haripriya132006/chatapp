// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const BASE_URL = "https://chatapp.up.railway.app";

function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const ws = useRef(null);
  const bottomRef = useRef();

  useEffect(() => {
    // 1. Fetch message history
    axios.get(`${BASE_URL}/history/${currentUser}/${chatPartner}`)
      .then((res) => {
        // Sort by timestamp if needed
        const sorted = res.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(sorted);
      });

    // 2. Setup WebSocket connection
    ws.current = new WebSocket(`ws://localhost:8000/ws/${currentUser}`);

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const participants = [message.from, message.to];
      if (participants.includes(chatPartner)) {
        setMessages((prev) => [...prev, message]);
      }
    };

    return () => {
      ws.current.close();
    };
  }, [chatPartner, currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const messageData = {
      to: chatPartner,
      text: text.trim(),
    };
    ws.current.send(JSON.stringify(messageData));

    const localTimestamp = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        from: currentUser,
        to: chatPartner,
        text: text.trim(),
        timestamp: localTimestamp,
      },
    ]);
    setText("");
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>
        Chatting with <strong>{chatPartner}</strong>
      </h2>
      <button onClick={goBack} style={{ marginBottom: "15px" }}>
        ⬅ Back
      </button>

      <div
        style={{
          border: "1px solid #ccc",
          height: "400px",
          overflowY: "scroll",
          padding: "10px",
          marginBottom: "20px",
          backgroundColor: "#f9f9f9",
        }}
      >

{messages.map((msg, index) => {
  // Handles both real-time messages (msg.from) and history messages (msg.from_user)
  const sender = msg.from || msg.from_user;
  const alignRight = sender === currentUser;

  return (
    <div
      key={index}
      style={{
        textAlign: alignRight ? "right" : "left",
        marginBottom: "10px",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "8px 12px",
          borderRadius: "8px",
          backgroundColor: alignRight ? "#d1e7dd" : "#f8d7da",
          maxWidth: "70%",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{sender}</div>
        <div>{msg.text}</div>
        <div
          style={{
            fontSize: "0.75rem",
            marginTop: "4px",
            textAlign: "right",
            color: "#555",
          }}
        >
          {new Date(msg.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
})}


        <div ref={bottomRef} />
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Type a message..."
        style={{ width: "80%", marginRight: "10px" }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default ChatWindow;
