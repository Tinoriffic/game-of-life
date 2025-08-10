import React, { useState } from 'react';
import { challengeService } from '../../../services/challengeService';
import ChallengeCompletionModal from './ChallengeCompletionModal';
import ChallengeActivityModal from './ChallengeActivityModal';
import Modal from '../../common/Modal';
import './ActiveChallenge.css';

const ActiveChallenge = ({ activeChallenge, onChallengeCompleted, onChallengeQuit }) => {
    const [completingDay, setCompletingDay] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showQuitModal, setShowQuitModal] = useState(false);
    const [completionData, setCompletionData] = useState(null);
    const [error, setError] = useState('');

    if (!activeChallenge) {
        return (
            <div className="no-active-challenge">
                <div className="no-challenge-content">
                    <h2>No Active Challenge</h2>
                    <p>You don't have any active challenges right now.</p>
                    <p>Browse available challenges to start your journey!</p>
                </div>
            </div>
        );
    }

    const { user_challenge, current_day, completed_days, today_completed, can_complete_today } = activeChallenge;
    const challenge = user_challenge.challenge;
    const progressPercentage = (completed_days / challenge.duration_days) * 100;

    const handleMarkComplete = async (activityData = null) => {
        if (!can_complete_today || completingDay) return;

        try {
            setCompletingDay(true);
            setError('');

            const progressEntry = await challengeService.markDayComplete(activityData);
            
            if (user_challenge.is_completed) {
                setCompletionData({
                    challenge: challenge,
                    progressEntry: progressEntry,
                    totalXpEarned: calculateTotalXpEarned() + progressEntry.xp_awarded
                });
                setShowCompletionModal(true);
            }
            
            await onChallengeCompleted();
            setShowActivityModal(false);
        } catch (err) {
            console.error('Error marking day complete:', err);
            setError('Failed to mark day complete. Please try again.');
        } finally {
            setCompletingDay(false);
        }
    };

    const handleQuitChallenge = async () => {
        try {
            await challengeService.quitChallenge();
            await onChallengeQuit();
            setShowQuitModal(false);
        } catch (err) {
            console.error('Error quitting challenge:', err);
            setError('Failed to quit challenge. Please try again.');
        }
    };

    const calculateTotalXpEarned = () => {
        return user_challenge.progress_entries.reduce((total, entry) => total + entry.xp_awarded, 0);
    };

    const getDailyXpReward = () => {
        return challenge.target_stats.reduce((total, stat) => total + stat.xp, 0);
    };

    const getActivityType = () => {
        return challenge.activity_type;
    };

    const needsActivityData = () => {
        const activityType = getActivityType();
        return activityType && ['cardio', 'meditation', 'learning', 'social'].includes(activityType);
    };

    const handleCompleteButtonClick = () => {
        if (needsActivityData()) {
            setShowActivityModal(true);
        } else {
            handleMarkComplete();
        }
    };

    const formatStatRewards = (targetStats) => {
        return targetStats.map(stat => `+${stat.xp} ${stat.stat}`).join(', ');
    };

    const getDaysRemaining = () => {
        return challenge.duration_days - current_day + 1;
    };

    return (
        <div className="active-challenge">
            <div className="challenge-header">
                <h2>{challenge.title}</h2>
                <div className="challenge-meta">
                    <span className="day-counter">Day {current_day} of {challenge.duration_days}</span>
                    <span className="days-remaining">
                        {getDaysRemaining() > 0 ? `${getDaysRemaining()} days left` : 'Final day!'}
                    </span>
                </div>
            </div>

            <div className="challenge-progress">
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                <div className="progress-stats">
                    <span>{completed_days} of {challenge.duration_days} days completed</span>
                    <span>{Math.round(progressPercentage)}%</span>
                </div>
            </div>

            <div className="challenge-description">
                <p>{challenge.description}</p>
            </div>

            <div className="daily-rewards">
                <h4>Daily Rewards</h4>
                <p>{formatStatRewards(challenge.target_stats)}</p>
                {getDailyXpReward() > 0 && (
                    <p className="total-xp">Total: +{getDailyXpReward()} XP per day</p>
                )}
            </div>

            <div className="completion-section">
                {today_completed ? (
                    <div className="day-completed">
                        <span className="completed-icon">✅</span>
                        <span>Today's challenge completed!</span>
                    </div>
                ) : can_complete_today ? (
                    <button 
                        onClick={handleCompleteButtonClick}
                        disabled={completingDay}
                        className="complete-day-btn"
                    >
                        {completingDay ? 'Completing...' : 'Mark Today Complete'}
                    </button>
                ) : (
                    <div className="cannot-complete">
                        <span>You can only complete today's challenge</span>
                    </div>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="challenge-actions">
                <button 
                    onClick={() => setShowQuitModal(true)}
                    className="quit-challenge-btn"
                >
                    Quit Challenge
                </button>
            </div>

            {/* Activity Modal for challenges that need specific data */}
            {showActivityModal && (
                <ChallengeActivityModal
                    challenge={challenge}
                    onComplete={handleMarkComplete}
                    onCancel={() => setShowActivityModal(false)}
                />
            )}

            {/* Completion Modal */}
            {showCompletionModal && completionData && (
                <ChallengeCompletionModal
                    completionData={completionData}
                    onClose={() => setShowCompletionModal(false)}
                />
            )}

            {/* Quit Confirmation Modal */}
            {showQuitModal && (
                <Modal onClose={() => setShowQuitModal(false)}>
                    <div className="quit-confirmation-modal">
                        <h3>Quit Challenge?</h3>
                        <p>Are you sure you want to quit "{challenge.title}"?</p>
                        <p>Your progress will be saved, but you won't be able to complete this challenge or earn its rewards.</p>
                        
                        <div className="modal-actions">
                            <button onClick={() => setShowQuitModal(false)} className="cancel-btn">
                                Cancel
                            </button>
                            <button onClick={handleQuitChallenge} className="quit-btn">
                                Quit Challenge
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ActiveChallenge;