import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import { hasClickTracking } from '../../../services/focusService';
import './StatsPage.css';

/**
 * Stats shell (§7): title + segmented control over nested routes —
 * Overall (`/stats`) · Fitness (`/stats/fitness`) · Clicks (`/stats/clicks`).
 * URLs carry the tab state so deep links, refresh, and the PWA back
 * gesture all behave.
 */
const StatsPage = () => {
  const { user } = useUser();
  const tabClass = ({ isActive }) => `stats-tab ${isActive ? 'active' : ''}`;

  return (
    <div className="stats-page">
      <h1 className="stats-title">My Progress</h1>
      <nav className="stats-tabs">
        <NavLink end to="/stats" className={tabClass}>Overall</NavLink>
        <NavLink to="/stats/fitness" className={tabClass}>Fitness</NavLink>
        {hasClickTracking(user) && (
          <NavLink to="/stats/clicks" className={tabClass}>Clicks</NavLink>
        )}
      </nav>
      <Outlet />
    </div>
  );
};

export default StatsPage;
