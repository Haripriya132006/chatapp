// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const BASE_URL = "https://chatapp-yc2g.onrender.com";

function ChatWindow({ currentUser, chatPartner, goBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const ws = useRef(null);
  const bottomRef = useRef();

  useEffect(() => {
    // 1. Fetch message history
    axios.get(`${BASE_URL}/history/${currentUser}/${chatPartner}`)
      .then((res) => {
        // Normalize message keys
        const normalized = res.data.map((msg) => ({
          ...msg,
          from: msg.from || msg.from_user,
          to: msg.to || msg.to_user,
        }));
        const sorted = normalized.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setMessages(sorted);
      });

    // 2. Setup WebSocket connection
    // ws.current = new WebSocket(`ws://localhost:8000/ws/${currentUser}`);
    ws.current = new WebSocket(`ws://chatapp-yc2g.onrender.com/ws/${currentUser}`);


    ws.current.onmessage = (event) => {
      const raw = JSON.parse(event.data);
      const message = {
        from: raw.from || raw.from_user,
        to: raw.to || raw.to_user,
        text: raw.text,
        timestamp: raw.timestamp,
        _id: raw._id,
      };

      if ([message.from, message.to].includes(chatPartner)) {
        setMessages((prev) => [...prev, message]);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [chatPartner, currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const messageData = {
      from:currentUser,
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
          const sender = msg.from;
          const alignRight = sender === currentUser;
          return (
            <div
              key={msg._id || index}
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
