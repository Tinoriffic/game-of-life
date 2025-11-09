import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { useState } from 'react';
import MainMenu from './components/MainMenu';
import LoginPage from './components/auth/LoginPage';
import ActivityLogger from './components/dashboard/daily/ActivityLogger';
import Dashboard from './components/dashboard/Dashboard';
import UserSetupPage from './components/auth/UserSetupPage';
import TokenReceiver from './components/auth/TokenReceiver';
import SocialLogs from './components/dashboard/daily/SocialLogs';
import JournalLogs from './components/dashboard/daily/JournalLogs';
import MeditationLogs from './components/dashboard/daily/MeditationLogs';
import LearningLogs from './components/dashboard/daily/LearningLogs';
import FitnessLogger from './components/dashboard/fitness/FitnessLogger';
import StatsPage from './components/dashboard/stats/StatsPage';
import ChallengesPage from './components/dashboard/challenges/ChallengesPage';
import AdminPanel from './components/admin/AdminPanel';
import { useUser } from './components/player/UserContext';

function App() {
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <Router>
      {/* Backdrop overlay when menu is open */}
      {menuOpen && <div className="menu-backdrop" onClick={closeMenu}></div>}

      <header className="main-header">
        <h1>Me v2</h1>
        <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>
      <nav className={`main-nav ${menuOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <h2>Main Menu</h2>
          <button className="close-button" onClick={closeMenu} aria-label="Close menu">×</button>
        </div>
        <ul>
          <li><Link to="/" onClick={closeMenu}><span className="nav-icon">🏠</span> Home</Link></li>
          <li><Link to="/challenges" onClick={closeMenu}><span className="nav-icon">🎯</span> Challenges</Link></li>
          {/* <li>Skill Tree</li> */}
          {/* <li>Milestones</li> - No route implemented yet */}
          <li><Link to="/dashboard" onClick={closeMenu}><span className="nav-icon">📝</span> Action Logger</Link></li>
          <li><Link to="/stats" onClick={closeMenu}><span className="nav-icon">📊</span> Stats</Link></li>
          {user?.role === 'admin' && (
            <li><Link to="/admin" onClick={closeMenu}><span className="nav-icon">⚙️</span> Admin Panel</Link></li>
          )}
        </ul>
        <div className="nav-footer">
          {user && <div className="nav-user-info">👤 {user.display_name || user.username}</div>}
          <div className="nav-version">v0.1.0</div>
        </div>
      </nav>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<TokenReceiver />} />
        <Route path="/user-setup" element={<UserSetupPage />} />
        <Route path="/" element={<MainMenu />} />
        <Route path="/daily" element={<ActivityLogger />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log-social-activity" element={<SocialLogs />} />
        <Route path="/log-journal-entry" element={<JournalLogs />} /> 
        <Route path="/log-meditation" element={<MeditationLogs />} />
        <Route path="/log-learning-session" element={<LearningLogs />} />
        <Route path="/fitness" element={<FitnessLogger />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
