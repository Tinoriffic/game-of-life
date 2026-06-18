import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import TokenReceiver from './components/auth/TokenReceiver';
import UserSetupPage from './components/auth/UserSetupPage';

import TodayPage from './components/today/TodayPage';
import StatsPage from './components/dashboard/stats/StatsPage';
import ChallengesPage from './components/dashboard/challenges/ChallengesPage';
import ProfilePage from './components/profile/ProfilePage';
import ManageHabitsPage from './components/habits/ManageHabitsPage';
import TabBar from './components/common/TabBar';
import InstallBanner from './components/pwa/InstallPrompt';

// Legacy surfaces kept for depth features (per-set workout logger, admin, classic loggers)
import MainMenu from './components/MainMenu';
import Dashboard from './components/dashboard/Dashboard';
import ActivityLogger from './components/dashboard/daily/ActivityLogger';
import SocialLogs from './components/dashboard/daily/SocialLogs';
import JournalLogs from './components/dashboard/daily/JournalLogs';
import MeditationLogs from './components/dashboard/daily/MeditationLogs';
import LearningLogs from './components/dashboard/daily/LearningLogs';
import FitnessLogger from './components/dashboard/fitness/FitnessLogger';
import WorkoutLogPage from './components/workout/WorkoutLogPage';
import AdminPanel from './components/admin/AdminPanel';

/**
 * v1.0.0: the old "pick a category to explore" nav becomes
 * Today · Stats · Challenges · Profile. Today is home.
 */
function App() {
  return (
    <Router>
      <div className="app-shell">
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<TokenReceiver />} />
          <Route path="/user-setup" element={<UserSetupPage />} />

          {/* The four top-level surfaces */}
          <Route path="/" element={<><InstallBanner /><TodayPage /></>} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/habits" element={<ManageHabitsPage />} />

          {/* Depth + legacy routes */}
          <Route path="/workout/log/:habitId" element={<WorkoutLogPage />} />
          <Route path="/fitness" element={<FitnessLogger />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/home-classic" element={<MainMenu />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/daily" element={<ActivityLogger />} />
          <Route path="/log-social-activity" element={<SocialLogs />} />
          <Route path="/log-journal-entry" element={<JournalLogs />} />
          <Route path="/log-meditation" element={<MeditationLogs />} />
          <Route path="/log-learning-session" element={<LearningLogs />} />
        </Routes>
        <TabBar />
      </div>
    </Router>
  );
}

export default App;
