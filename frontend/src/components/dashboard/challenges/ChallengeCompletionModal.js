import React, { useEffect, useState } from 'react';
import Modal from '../../common/Modal';
import './ChallengeCompletionModal.css';

const ChallengeCompletionModal = ({ completionData, onClose }) => {
    const [showConfetti, setShowConfetti] = useState(false);
    const { challenge, totalXpEarned } = completionData;

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

    return (
        <Modal onClose={onClose} className="completion-modal">
            <div className="challenge-completion-modal">
                {showConfetti && <div className="confetti">🎉✨🎊✨🎉</div>}
                
                <div className="celebration-header">
                    <div className="celebration-title">
                        <span className="celebration-emoji">🏆 🎉 🏆</span>
                        <h1>Challenge Complete!</h1>
                        <h2>{challenge.title}</h2>
                    </div>
                </div>

                {challenge.badge && (
                    <div className="badge-showcase">
                        <div className="badge-earned-text">Badge Earned!</div>
                        <div className="badge-display-large">
                            {challenge.badge.icon_url ? (
                                <img src={challenge.badge.icon_url} alt={challenge.badge.title} className="badge-icon-large" />
                            ) : (
                                <div className="default-badge-icon-large">🏅</div>
                            )}
                        </div>
                        <div className="badge-info-large">
                            <div className="badge-title-large">{challenge.badge.title}</div>
                            {challenge.badge.description && (
                                <div className="badge-description-large">{challenge.badge.description}</div>
                            )}
                        </div>
                    </div>
                )}

                <div className="stats-summary">
                    <div className="summary-item">
                        <span className="summary-value">{Number(challenge?.duration_days || 0)}</span>
                        <span className="summary-label">Days</span>
                    </div>
                    <div className="summary-divider">•</div>
                    <div className="summary-item">
                        <span className="summary-value">+{Number(totalXpEarned || 0)}</span>
                        <span className="summary-label">Total XP</span>
                    </div>
                    <div className="summary-divider">•</div>
                    <div className="summary-item">
                        <span className="summary-value">{formatStatRewards(challenge?.target_stats || []).map(stat => stat?.name).join(', ')}</span>
                        <span className="summary-label">Stats Boosted</span>
                    </div>
                </div>


                <div className="modal-actions">
                    <button onClick={onClose} className="close-btn">
                        Continue
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ChallengeCompletionModal;