import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import LoginPage from './components/LoginPage';
import ActionLogger from './components/ActionLogger';
import UserSetupPage from './components/UserSetupPage';
import TokenReceiver from './components/TokenReceiver';

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
        <Route path="/auth/callback" element={<TokenReceiver />} />
        <Route path="/user-setup" element={<UserSetupPage />} />
        <Route path="/" element={<MainMenu />} />
        {/* TODO: route for ActionLogger */}
        <Route path="/log-actions" element={<ActionLogger />} />
        {/* Define other routes */}
      </Routes>
    </Router>
  );
}

export default App;
