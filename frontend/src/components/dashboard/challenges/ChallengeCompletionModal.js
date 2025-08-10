import React, { useEffect, useState } from 'react';
import Modal from '../../common/Modal';
import './ChallengeCompletionModal.css';

const ChallengeCompletionModal = ({ completionData, onClose }) => {
    const [showConfetti, setShowConfetti] = useState(false);
    const { challenge, progressEntry, totalXpEarned } = completionData;

    useEffect(() => {
        setShowConfetti(true);
        
        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const formatStatRewards = (targetStats) => {
        return targetStats.map(stat => ({
            name: stat.stat,
            xp: stat.xp
        }));
    };

    const getTotalDailyXp = () => {
        return challenge.target_stats.reduce((total, stat) => total + stat.xp, 0);
    };

    const getCompletionBonusXp = () => {
        return challenge.completion_xp_bonus || 0;
    };

    return (
        <Modal onClose={onClose} className="completion-modal">
            <div className="challenge-completion-modal">
                {showConfetti && <div className="confetti">🎉✨🎊✨🎉</div>}
                
                <div className="completion-header">
                    <div className="completion-icon">🏆</div>
                    <h2>Challenge Complete!</h2>
                    <h3>{challenge.title}</h3>
                </div>

                <div className="completion-stats">
                    <div className="stat-summary">
                        <h4>Your Achievement</h4>
                        <div className="achievement-grid">
                            <div className="achievement-item">
                                <span className="achievement-value">{challenge.duration_days}</span>
                                <span className="achievement-label">Days Completed</span>
                            </div>
                            <div className="achievement-item">
                                <span className="achievement-value">{totalXpEarned}</span>
                                <span className="achievement-label">Total XP Earned</span>
                            </div>
                        </div>
                    </div>

                    <div className="xp-breakdown">
                        <h4>XP Breakdown</h4>
                        <div className="xp-details">
                            <div className="xp-line">
                                <span>Daily rewards ({challenge.duration_days} days):</span>
                                <span>+{getTotalDailyXp() * challenge.duration_days} XP</span>
                            </div>
                            {getCompletionBonusXp() > 0 && (
                                <div className="xp-line bonus">
                                    <span>Completion bonus:</span>
                                    <span>+{getCompletionBonusXp()} XP</span>
                                </div>
                            )}
                            <div className="xp-line total">
                                <span><strong>Total XP Earned:</strong></span>
                                <span><strong>+{totalXpEarned} XP</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="stats-affected">
                        <h4>Stats Improved</h4>
                        <div className="stats-grid">
                            {formatStatRewards(challenge.target_stats).map((stat, index) => (
                                <div key={index} className="stat-reward">
                                    <span className="stat-name">{stat.name}</span>
                                    <span className="stat-gain">+{stat.xp * challenge.duration_days} XP</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {challenge.badge && (
                        <div className="badge-earned">
                            <h4>Badge Unlocked!</h4>
                            <div className="badge-display">
                                {challenge.badge.icon_url ? (
                                    <img src={challenge.badge.icon_url} alt={challenge.badge.title} className="badge-icon" />
                                ) : (
                                    <div className="default-badge-icon">🏅</div>
                                )}
                                <div className="badge-info">
                                    <span className="badge-title">{challenge.badge.title}</span>
                                    {challenge.badge.description && (
                                        <span className="badge-description">{challenge.badge.description}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="completion-message">
                    <p>Congratulations! You've successfully completed the {challenge.title} challenge.</p>
                    <p>Your dedication and consistency have paid off. Keep up the great work!</p>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="close-btn">
                        Awesome! Continue
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ChallengeCompletionModal;