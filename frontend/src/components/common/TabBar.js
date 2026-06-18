import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './TabBar.css';

const TABS = [
    { to: '/', label: 'Today', icon: '☀' },
    { to: '/stats', label: 'Stats', icon: '📊' },
    { to: '/challenges', label: 'Challenges', icon: '⚔' },
    { to: '/profile', label: 'Profile', icon: '👤' }
];

const HIDDEN_ON = ['/login', '/auth/callback', '/user-setup'];

/** The simplified top-level nav: Today · Stats · Challenges · Profile. */
const TabBar = () => {
    const location = useLocation();
    if (HIDDEN_ON.some((path) => location.pathname.startsWith(path))) return null;

    return (
        <nav className="tab-bar">
            {TABS.map((tab) => (
                <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.to === '/'}
                    className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default TabBar;
