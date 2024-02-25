import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import LoginPage from './components/auth/LoginPage';
import ActivityLogger from './components/dashboard/ActivityLogger';
import Dashboard from './components/dashboard/Dashboard';
import UserSetupPage from './components/auth/UserSetupPage';
import TokenReceiver from './components/auth/TokenReceiver';
import SocialLogs from './components/dashboard/SocialLogs';

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
          <li><Link to="/dashboard">Action Logger</Link></li>
        </ul>
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<TokenReceiver />} />
        <Route path="/user-setup" element={<UserSetupPage />} />
        <Route path="/" element={<MainMenu />} />
        <Route path="/daily" element={<ActivityLogger />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log-social-activity" element={<SocialLogs />} />
        {/* Define other routes */}
      </Routes>
    </Router>
  );
}

export default App;
