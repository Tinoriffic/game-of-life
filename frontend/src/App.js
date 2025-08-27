import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
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
  
  return (
    <Router>
      <header className="main-header">
        <h1>Me v2</h1>
      </header>
      <nav className="main-nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/challenges">Challenges</Link></li>
          {/* <li>Skill Tree</li> */}
          <li>Milestones</li>
          <li><Link to="/dashboard">Action Logger</Link></li>
          <li><Link to="/stats">Stats</Link></li>
          {user?.role === 'ADMIN' && (
            <li><Link to="/admin">Admin Panel</Link></li>
          )}
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
