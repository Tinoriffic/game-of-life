import React, { useState } from 'react';
import { challengeService } from '../../../services/challengeService';
import Modal from '../../common/Modal';
import './ChallengeLibrary.css';

const ChallengeLibrary = ({ challenges, hasActiveChallenge, onChallengeJoined }) => {
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    const openChallengeDetails = (challenge) => {
        setSelectedChallenge(challenge);
        setShowJoinModal(true);
        setError('');
    };

    const closeChallengeDetails = () => {
        setSelectedChallenge(null);
        setShowJoinModal(false);
        setError('');
    };

    const handleJoinChallenge = async () => {
        if (!selectedChallenge || hasActiveChallenge) return;

        try {
            setJoining(true);
            setError('');
            
            const userChallenge = await challengeService.joinChallenge(selectedChallenge.id);
            
            onChallengeJoined(userChallenge);
            closeChallengeDetails();
        } catch (err) {
            console.error('Error joining challenge:', err);
            setError('Failed to join challenge. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    const formatStatRewards = (targetStats) => {
        if (!targetStats || targetStats.length === 0) return 'No stat rewards';
        
        return targetStats.map(stat => `+${stat.xp} ${stat.stat}`).join(', ');
    };

    const renderChallengeCard = (challenge) => (
        <div key={challenge.id} className="challenge-card" onClick={() => openChallengeDetails(challenge)}>
            <div className="challenge-icon">
                {challenge.icon ? (
                    <img src={challenge.icon} alt={challenge.title} />
                ) : (
                    <div className="default-challenge-icon">🎯</div>
                )}
            </div>
            <div className="challenge-info">
                <h3>{challenge.title}</h3>
                <p className="challenge-duration">{challenge.duration_days} days</p>
                <p className="challenge-description">{challenge.description}</p>
                <div className="challenge-stats">
                    <small>Rewards: {formatStatRewards(challenge.target_stats)}</small>
                </div>
            </div>
            <div className="challenge-action">
                <button className="join-preview-btn">View Details</button>
            </div>
        </div>
    );

    return (
        <div className="challenge-library">
            {challenges.length === 0 ? (
                <div className="no-challenges">
                    <p>No challenges available at the moment.</p>
                    <p>Check back later for new challenges!</p>
                </div>
            ) : (
                <>
                    {hasActiveChallenge && (
                        <div className="active-challenge-notice">
                            <p>You already have an active challenge. Complete or quit your current challenge to join a new one.</p>
                        </div>
                    )}
                    <div className="challenges-grid">
                        {challenges.map(renderChallengeCard)}
                    </div>
                </>
            )}

            {showJoinModal && selectedChallenge && (
                <Modal onClose={closeChallengeDetails}>
                    <div className="challenge-details-modal">
                        <h2>{selectedChallenge.title}</h2>
                        <div className="challenge-details">
                            <div className="detail-section">
                                <h4>Description</h4>
                                <p>{selectedChallenge.description}</p>
                            </div>
                            
                            <div className="detail-section">
                                <h4>Duration</h4>
                                <p>{selectedChallenge.duration_days} days</p>
                            </div>
                            
                            <div className="detail-section">
                                <h4>Daily Rewards</h4>
                                <ul>
                                    {selectedChallenge.target_stats.map((stat, index) => (
                                        <li key={index}>+{stat.xp} {stat.stat} XP</li>
                                    ))}
                                </ul>
                            </div>
                            
                            {selectedChallenge.completion_xp_bonus > 0 && (
                                <div className="detail-section">
                                    <h4>Completion Bonus</h4>
                                    <p>+{selectedChallenge.completion_xp_bonus} XP bonus for completing the entire challenge!</p>
                                </div>
                            )}
                            
                            {selectedChallenge.badge && (
                                <div className="detail-section">
                                    <h4>Badge Reward</h4>
                                    <div className="badge-preview">
                                        {selectedChallenge.badge.icon_url && (
                                            <img src={selectedChallenge.badge.icon_url} alt={selectedChallenge.badge.title} />
                                        )}
                                        <span>{selectedChallenge.badge.title}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="modal-actions">
                            <button onClick={closeChallengeDetails} className="cancel-btn">
                                Cancel
                            </button>
                            <button 
                                onClick={handleJoinChallenge}
                                disabled={joining || hasActiveChallenge}
                                className={hasActiveChallenge ? 'join-btn disabled' : 'join-btn'}
                            >
                                {joining ? 'Joining...' : hasActiveChallenge ? 'Already Active' : 'Join Challenge'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ChallengeLibrary;