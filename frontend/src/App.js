import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import TokenReceiver from './components/auth/TokenReceiver';
import UserSetupPage from './components/auth/UserSetupPage';

import TodayPage from './components/today/TodayPage';
import StatsPage from './components/dashboard/stats/StatsPage';
import OverallTab from './components/dashboard/stats/OverallTab';
import FitnessTab from './components/dashboard/stats/FitnessTab';
import ChallengesPage from './components/dashboard/challenges/ChallengesPage';
import ProfilePage from './components/profile/ProfilePage';
import ManageHabitsPage from './components/habits/ManageHabitsPage';
import FocusPage from './components/focus/FocusPage';
import ClicksPage from './components/focus/ClicksPage';
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
          <Route path="/stats" element={<StatsPage />}>
            <Route index element={<OverallTab />} />
            <Route path="fitness" element={<FitnessTab />} />
            {/* Clicks is feature-flagged; endpoints 403 server-side when off */}
            <Route path="clicks" element={<ClicksPage embedded />} />
          </Route>
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/habits" element={<ManageHabitsPage />} />

          {/* Click tracking (feature-flagged; routes 403 server-side when off) */}
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/clicks" element={<Navigate to="/stats/clicks" replace />} />

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
