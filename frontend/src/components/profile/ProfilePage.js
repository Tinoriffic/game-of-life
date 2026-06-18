import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../axios';
import { habitService } from '../../services/habitService';
import { useUser } from '../player/UserContext';
import PlayerCard from '../player/PlayerCard';
import { useInstallPrompt } from '../pwa/InstallPrompt';
import { APP_VERSION } from '../../appVersion';
import './ProfilePage.css';

/**
 * Profile = the thing a friend will eventually see (Phase 3 hook):
 * avatar, title, player level, attributes, badges, top streaks.
 * Built single-player, shaped public.
 */
const ProfilePage = () => {
    const { user, setUser } = useUser();
    const [playerData, setPlayerData] = useState(null);
    const [overview, setOverview] = useState(null);
    const navigate = useNavigate();
    const { canInstall, promptInstall, isIOS } = useInstallPrompt();

    useEffect(() => {
        axiosInstance.get('/users/me')
            .then((response) => {
                setPlayerData(response.data);
                setUser(response.data);
            })
            .catch((err) => console.error('Error loading profile:', err));
        habitService.getStatsOverview()
            .then(setOverview)
            .catch((err) => console.error('Error loading overview:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userId');
        navigate('/login');
    };

    if (!playerData) {
        return <div className="profile-page"><div className="today-skeleton">Loading profile…</div></div>;
    }

    const player = overview?.player;
    const topStreaks = (overview?.habits || [])
        .filter((h) => h.current_streak > 0)
        .sort((a, b) => b.current_streak - a.current_streak)
        .slice(0, 3);

    return (
        <div className="profile-page">
            {player && (
                <div className="profile-level-card">
                    <div className="profile-level-badge">LVL {player.level}</div>
                    <div className="profile-level-info">
                        <div className="player-xp-bar">
                            <div className="player-xp-fill" style={{ width: `${Math.round(player.level_progress * 100)}%` }} />
                        </div>
                        <span className="profile-xp-text">
                            {player.xp_into_level} / {player.xp_into_level + player.xp_to_next} XP to next level
                        </span>
                    </div>
                </div>
            )}

            {overview && (
                <div className="profile-consistency">
                    <div className="pc-stat">
                        <span className="pc-value">🔥 {overview.consistency.day_streak}</span>
                        <span className="pc-label">day streak</span>
                    </div>
                    <div className="pc-stat">
                        <span className="pc-value">{overview.consistency.best_day_streak}</span>
                        <span className="pc-label">best streak</span>
                    </div>
                    <div className="pc-stat">
                        <span className="pc-value">{overview.consistency.total_days_logged}</span>
                        <span className="pc-label">days logged</span>
                    </div>
                </div>
            )}

            {topStreaks.length > 0 && (
                <div className="profile-top-streaks">
                    {topStreaks.map((h) => (
                        <span className="top-streak-chip" key={h.id}>
                            {h.icon} {h.name} 🔥{h.current_streak}
                        </span>
                    ))}
                </div>
            )}

            <PlayerCard playerData={playerData} />

            <div className="profile-links">
                <Link to="/habits" className="profile-link">⚙ Manage habits</Link>
                {(canInstall || isIOS) && (
                    <button className="profile-link" onClick={promptInstall}>
                        📲 Install the app
                    </button>
                )}
                {user?.role === 'admin' && (
                    <Link to="/admin" className="profile-link">🛠 Admin panel</Link>
                )}
                <button className="profile-link logout" onClick={logout}>↪ Log out</button>
            </div>

            <div className="profile-version">Me v2 · v{APP_VERSION}</div>
        </div>
    );
};

export default ProfilePage;
