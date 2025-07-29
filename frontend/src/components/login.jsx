import React, { useState } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:8000";

function Login({ setUsername, goToSignup }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [showRecovery, setShowRecovery] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isAnswerVerified, setIsAnswerVerified] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !password.trim()) {
      setError("Both fields are required.");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/login`, {
        username: name.trim(),
        password: password.trim(),
      });
      localStorage.setItem("username", name.trim());
      setUsername(name.trim());
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed.");
    }
  };

  const fetchSecurityQuestion = async () => {
    if (!name.trim()) {
      setError("Enter your username first.");
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/recovery-question/${name.trim()}`);
      setQuestion(res.data.question);
      setShowRecovery(true);
      setError("");
    } catch {
      setError("User not found.");
    }
  };

  const verifyAnswer = async () => {
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        username: name.trim(),
        answer: answer.trim(),
        new_password: "TEMP", // test value, actual update later
      });
      setIsAnswerVerified(true);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Answer verification failed.");
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        username: name.trim(),
        answer: answer.trim(),
        new_password: newPassword.trim(),
      });
      alert("Password reset successful. You can log in now.");
      setShowRecovery(false);
      setPassword("");
      setAnswer("");
      setNewPassword("");
      setIsAnswerVerified(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>{showRecovery ? "Reset Password" : "Login"}</h2>

      <input
        type="text"
        placeholder="Username"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
        }}
        style={{ marginBottom: "10px" }}
      /><br />

      {!showRecovery ? (
        <>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ marginBottom: "10px" }}
          /><br />
          <button onClick={handleLogin}>Login</button>
          <button onClick={fetchSecurityQuestion}>Forgot Password</button>
          <button onClick={goToSignup}>Create an Account</button>
        </>
      ) : (
        <>
          <p><strong>Security Question:</strong> {question}</p>

          {!isAnswerVerified ? (
            <>
              <input
                type="text"
                placeholder="Your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                style={{ marginBottom: "10px" }}
              /><br />
              <button onClick={verifyAnswer}>Verify Answer</button>
              <button onClick={() => setShowRecovery(false)}>Back to Login</button>
            </>
          ) : (
            <>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ marginBottom: "10px" }}
              /><br />
              <button onClick={handleResetPassword}>Reset Password</button>
              <button onClick={() => setShowRecovery(false)}>Back to Login</button>
            </>
          )}
        </>
      )}

      {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
    </div>
  );
}

export default Login;
