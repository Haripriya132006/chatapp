import React, { useState } from "react";
import Login from "./components/login";
import Signin from "./components/signin";
import RequestPanel from "./components/requestpanel";
import ChatWindow from "./components/chatwindow";

function App() {
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [chatPartner, setChatPartner] = useState("");
  const [showSignup, setShowSignup] = useState(false);

  const goToSignup = () => setShowSignup(true);
  const goToLogin = () => setShowSignup(false);

  if (!username) {
    return showSignup ? (
      <Signin goToLogin={goToLogin} setUsername={setUsername} />
    ) : (
      <Login setUsername={setUsername} goToSignup={goToSignup} />
    );
  }

  return chatPartner ? (
    <ChatWindow
      currentUser={username}
      chatPartner={chatPartner}
      goBack={() => setChatPartner("")}
      logout={() => {
        localStorage.removeItem("username");
        setUsername("");
      }}
    />
  ) : (
    <RequestPanel
      currentUser={username}
      setChatPartner={setChatPartner}
      setUserName={setUsername}
    />
  );
}

export default App;
