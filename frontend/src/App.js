import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import LoginPage from './components/LoginPage';
import ActionLogger from './components/ActionLogger';
import ChooseUsernamePage from './components/ChooseUsernamePage';
import SetUserInfoPage from './components/SetUserInfoPage';

function App() {
  return (
    <Router>
      <header className="main-header">
        <h1>Game of Life</h1>
      </header>
      <nav className="main-nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li>Skill Tree</li>
          <li>Milestones</li>
          <li><Link to="/log-actions">Action Logger</Link></li>
        </ul>
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/choose-username" element={<ChooseUsernamePage />} />
        <Route path="/set-user-info" element={<SetUserInfoPage />} />
        <Route path="/" element={<MainMenu />} />
        {/* TODO: route for ActionLogger */}
        <Route path="/log-actions" element={<ActionLogger />} />
        {/* Define other routes */}
      </Routes>
    </Router>
  );
}

export default App;
