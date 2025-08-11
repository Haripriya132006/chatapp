import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = "https://chatapp-yc2g.onrender.com";

function RequestPanel({ currentUser, setChatPartner, setUserName }) {
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [newUser, setNewUser] = useState("");

  useEffect(() => {
    fetchAllowedUsers();
    fetchPendingRequests();
  }, []);

  const fetchAllowedUsers = async () => {
    const res = await axios.get(`${BASE_URL}/allowed-users/${currentUser}`);
    const data = res.data;

    setAllowedUsers(
      data.filter((r) => r.status === "accepted").map((r) => r.user)
    );
    setBlockedUsers(
      data.filter((r) => r.status === "blocked").map((r) => r.user)
    );
  };

  const fetchPendingRequests = async () => {
    const res = await axios.get(`${BASE_URL}/pending-requests/${currentUser}`);
    setPendingRequests(res.data);
  };

  const sendRequest = async () => {
    if (!newUser || newUser === currentUser) return;
    await axios.post(`${BASE_URL}/request-chat`, {
      from_user: currentUser,
      to_user: newUser,
    });
    alert("Request sent");
    setNewUser("");
  };

  const acceptRequest = async (fromUser) => {
    await axios.post(`${BASE_URL}/accept-chat`, {
      from_user: fromUser,
      to_user: currentUser,
    });
    fetchAllowedUsers();
    fetchPendingRequests();
  };

  const rejectRequest = async (fromUser) => {
    await axios.post(`${BASE_URL}/reject-chat`, {
      from_user: fromUser,
      to_user: currentUser,
    });
    fetchPendingRequests();
  };

  const toggleBlock = async (user) => {
    const isBlocked = blockedUsers.includes(user);
    const newStatus = isBlocked ? "accepted" : "blocked";
    await axios.post(`${BASE_URL}/update-status`, {
      from_user: currentUser,
      to_user: user,
      new_status: newStatus,
    });
    fetchAllowedUsers();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Welcome, {currentUser} 👋</h2>
      <button
        onClick={() => {
          localStorage.removeItem("username");
          setUserName("");
        }}
      >
        Logout
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>🔒 Send Chat Request</h3>
        <input
          type="text"
          placeholder="Enter username"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
        />
        <button onClick={sendRequest} style={{ marginLeft: "10px" }}>
          Send Request
        </button>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h3>📬 Incoming Requests</h3>
        {pendingRequests.length === 0 ? (
          <p>No pending requests</p>
        ) : (
          pendingRequests.map((req) => (
            <div key={req.id} style={{ marginBottom: "10px" }}>
              {req.from_user}
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => acceptRequest(req.from_user)}
              >
                Accept
              </button>
              <button
                style={{ marginLeft: "5px", color: "red" }}
                onClick={() => rejectRequest(req.from_user)}
              >
                Reject
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "30px" }}>
        <h3>💬 Allowed Users</h3>
        {allowedUsers.length === 0 ? (
          <p>You don't have any accepted chats yet</p>
        ) : (
          allowedUsers.map((u) => (
            <div key={u} style={{ marginBottom: "10px" }}>
              {u}
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => setChatPartner(u)}
              >
                Chat
              </button>
              <button
                style={{ marginLeft: "10px", color: blockedUsers.includes(u) ? "green" : "red" }}
                onClick={() => toggleBlock(u)}
              >
                {blockedUsers.includes(u) ? "Unblock" : "Block"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default RequestPanel;
