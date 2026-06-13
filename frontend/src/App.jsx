import React, { useState } from "react";
import { Route, Routes } from "react-router-dom";
import SearchPage from "./pages/SearchPage.jsx";
import CandidateProfilePage from "./pages/CandidateProfilePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogin = (user) => {
    setAuthUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_user");
    setAuthUser(null);
  };

  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-root">
      <Routes>
        <Route
          path="/"
          element={<SearchPage authUser={authUser} onLogout={handleLogout} />}
        />
        <Route
          path="/candidate/:id"
          element={
            <CandidateProfilePage authUser={authUser} onLogout={handleLogout} />
          }
        />
      </Routes>
    </div>
  );
}
