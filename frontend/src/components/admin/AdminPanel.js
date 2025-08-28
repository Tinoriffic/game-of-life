import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { useUser } from '../player/UserContext';
import './AdminPanel.css';

const AdminPanel = () => {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (activeTab === 'stats') {
            loadStats();
        } else if (activeTab === 'users') {
            loadUsers();
        } else if (activeTab === 'challenges') {
            loadChallenges();
        }
    }, [activeTab]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const statsData = await adminService.getStats();
            setStats(statsData);
        } catch (err) {
            setMessage('Error loading stats');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const usersData = await adminService.getAllUsers();
            setUsers(usersData);
        } catch (err) {
            setMessage('Error loading users');
        } finally {
            setLoading(false);
        }
    };

    const loadChallenges = async () => {
        setLoading(true);
        try {
            const challengesData = await adminService.getAllChallenges();
            setChallenges(challengesData);
        } catch (err) {
            setMessage('Error loading challenges');
        } finally {
            setLoading(false);
        }
    };

    const handleMakeAdmin = async (userId) => {
        try {
            await adminService.makeUserAdmin(userId);
            setMessage('User granted admin role');
            loadUsers(); // Refresh
        } catch (err) {
            setMessage('Error granting admin role');
        }
    };

    const handleToggleChallengeActive = async (challengeId) => {
        try {
            await adminService.toggleChallengeActive(challengeId);
            setMessage('Challenge status updated');
            loadChallenges(); // Refresh
        } catch (err) {
            setMessage('Error updating challenge status');
        }
    };

    const handleCompleteUserChallengeDay = async (userId) => {
        try {
            await adminService.completeChallengeDayForUser(userId);
            setMessage('Challenge day completed for user');
        } catch (err) {
            setMessage('Error completing challenge day');
        }
    };

    // Check if user is admin
    if (!user || user.role !== 'admin') {
        return (
            <div className="admin-panel">
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>Admin privileges required to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h1>Admin Panel</h1>
                <div className="admin-tabs">
                    <button 
                        className={activeTab === 'stats' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('stats')}
                    >
                        Stats
                    </button>
                    <button 
                        className={activeTab === 'users' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('users')}
                    >
                        Users
                    </button>
                    <button 
                        className={activeTab === 'challenges' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('challenges')}
                    >
                        Challenges
                    </button>
                </div>
            </div>

            {message && <div className="admin-message">{message}</div>}

            <div className="admin-content">
                {activeTab === 'stats' && (
                    <div className="admin-stats">
                        <h2>System Statistics</h2>
                        {loading ? (
                            <div className="loading">Loading...</div>
                        ) : stats ? (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>Total Users</h3>
                                    <p>{stats.total_users}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Total Challenges</h3>
                                    <p>{stats.total_challenges}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Active Challenges</h3>
                                    <p>{stats.active_challenges}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Users with Active Challenges</h3>
                                    <p>{stats.users_with_active_challenges}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="admin-users">
                        <h2>User Management</h2>
                        {loading ? (
                            <div className="loading">Loading...</div>
                        ) : (
                            <div className="users-table">
                                {users.map(user => (
                                    <div key={user.id} className="user-row">
                                        <div className="user-info">
                                            <strong>{user.username}</strong>
                                            <span>{user.email}</span>
                                            <span className="role">{user.role}</span>
                                        </div>
                                        <div className="user-actions">
                                            {user.role !== 'ADMIN' && (
                                                <button 
                                                    onClick={() => handleMakeAdmin(user.id)}
                                                    className="admin-btn"
                                                >
                                                    Make Admin
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleCompleteUserChallengeDay(user.id)}
                                                className="complete-btn"
                                            >
                                                Complete Challenge Day
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'challenges' && (
                    <div className="admin-challenges">
                        <h2>Challenge Management</h2>
                        {loading ? (
                            <div className="loading">Loading...</div>
                        ) : (
                            <div className="challenges-table">
                                {challenges.map(challenge => (
                                    <div key={challenge.id} className="challenge-row">
                                        <div className="challenge-info">
                                            <strong>{challenge.title}</strong>
                                            <span>{challenge.description}</span>
                                            <span className={`status ${challenge.is_active ? 'active' : 'inactive'}`}>
                                                {challenge.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="challenge-actions">
                                            <button 
                                                onClick={() => handleToggleChallengeActive(challenge.id)}
                                                className={challenge.is_active ? 'deactivate-btn' : 'activate-btn'}
                                            >
                                                {challenge.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;