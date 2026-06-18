import React, { useState, useEffect } from 'react';
import { challengeService } from '../../../services/challengeService';
import ChallengeActivityModal from './ChallengeActivityModal';
import './FailedChallengeCard.css';

const FailedChallengeCard = ({ failedChallenge, allowGracePeriod, onRestore, onDismiss }) => {
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [error, setError] = useState('');
    const [gracePeriodExpired, setGracePeriodExpired] = useState(false);
    const [hoursRemaining, setHoursRemaining] = useState(null);

    const { user_challenge, completed_days } = failedChallenge;
    const challenge = user_challenge.challenge;

    useEffect(() => {
        calculateGracePeriod();
        const interval = setInterval(calculateGracePeriod, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [user_challenge.failed_date]);

    const calculateGracePeriod = () => {
        if (!user_challenge.failed_date) {
            setGracePeriodExpired(true);
            return;
        }

        const failedDate = new Date(user_challenge.failed_date);
        const now = new Date();
        const gracePeriodEnd = new Date(failedDate);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + 48); // 48 hours = 2 days (failed yesterday, grace period today)

        const timeRemaining = gracePeriodEnd - now;

        if (timeRemaining <= 0) {
            setGracePeriodExpired(true);
            setHoursRemaining(0);
        } else {
            setGracePeriodExpired(false);
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            setHoursRemaining(hours);
        }
    };

    const handleRestoreClick = () => {
        if (needsActivityData()) {
            setShowActivityModal(true);
        } else {
            handleRestore();
        }
    };

    const handleRestore = async (activityData = null) => {
        setRestoring(true);
        setError('');

        try {
            // First, restore the challenge
            await challengeService.restoreChallenge(user_challenge.id);

            // If activity data is provided, mark the day complete
            if (activityData) {
                await challengeService.markDayComplete(activityData);
            }

            setShowActivityModal(false);
            await onRestore();
        } catch (err) {
            console.error('Error restoring challenge:', err);
            const errorMsg = err.response?.data?.detail || 'Failed to restore challenge. Please try again.';
            setError(errorMsg);
        } finally {
            setRestoring(false);
        }
    };

    const needsActivityData = () => {
        const activityType = challenge.activity_type;
        return activityType && ['cardio', 'meditation', 'learning', 'social'].includes(activityType);
    };

    const calculateTotalXpEarned = () => {
        return user_challenge.progress_entries?.reduce((total, entry) => total + entry.xp_awarded, 0) || 0;
    };

    const formatMissedDate = () => {
        if (!user_challenge.failed_date) return 'Unknown';
        const date = new Date(user_challenge.failed_date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (gracePeriodExpired && allowGracePeriod) {
        return null; // Don't show if grace period expired
    }

    return (
        <div className="failed-challenge-card">
            <div className="failed-challenge-header">
                <span className="failure-icon">⚠️</span>
                <h2>Challenge Interrupted</h2>
            </div>

            <div className="challenge-info-section">
                <h3>{challenge.title}</h3>
                <p className="missed-message">
                    You missed logging <strong>{challenge.activity_type || 'an activity'}</strong> on{' '}
                    <strong>{formatMissedDate()}</strong>
                </p>
            </div>

            <div className="challenge-summary">
                <h4>Final Stats</h4>
                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">Days Completed:</span>
                        <span className="stat-value">{completed_days}/{challenge.duration_days}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Streak:</span>
                        <span className="stat-value ended">{user_challenge.current_streak || completed_days} days (ended)</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">XP Earned:</span>
                        <span className="stat-value xp">{calculateTotalXpEarned()} XP</span>
                    </div>
                </div>
            </div>

            {allowGracePeriod && !gracePeriodExpired && (
                <div className="grace-period-section">
                    <div className="grace-period-timer">
                        <span className="timer-icon">⏱️</span>
                        <span className="timer-text">
                            Grace Period: <strong>{hoursRemaining} hours remaining</strong>
                        </span>
                    </div>
                    <p className="grace-period-prompt">
                        Did you actually complete this activity yesterday?
                    </p>
                    <button
                        onClick={handleRestoreClick}
                        disabled={restoring}
                        className="restore-challenge-btn"
                    >
                        {restoring ? 'Restoring...' : 'I completed it yesterday - Restore Challenge'}
                    </button>
                </div>
            )}

            {!allowGracePeriod && (
                <div className="no-grace-period">
                    <p>Grace period restoration is not currently enabled.</p>
                    <button onClick={onDismiss} className="dismiss-btn">
                        View Details
                    </button>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {/* Activity Modal for challenges that need specific data */}
            {showActivityModal && (
                <ChallengeActivityModal
                    challenge={challenge}
                    onComplete={handleRestore}
                    onCancel={() => setShowActivityModal(false)}
                />
            )}
        </div>
    );
};

export default FailedChallengeCard;