import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = "https://chatapp-yc2g.onrender.com/";

function Signin({ goToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!username || !password || !question || !answer) {
      setError("All fields are required.");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/signup`, {
        username,
        password,
        question,
        answer
      });
      alert('Signup successful! You can now log in.');
      goToLogin();
    } catch (err) {
      setError('Username already exists or signup failed.');
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
      <h2>Create Account</h2>
      
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          setError('');
        }}
      /><br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError('');
        }}
      /><br /><br />

      <input
        placeholder="Security Question"
        value={question}
        onChange={(e) => {
          setQuestion(e.target.value);
          setError('');
        }}
      /><br /><br />

      <input
        placeholder="Answer"
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value);
          setError('');
        }}
      /><br /><br />

      <button onClick={handleSignup}>Signup</button>
      <button onClick={goToLogin} style={{ marginLeft: "10px" }}>Back to Login</button>

      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  );
}

export default Signin;
