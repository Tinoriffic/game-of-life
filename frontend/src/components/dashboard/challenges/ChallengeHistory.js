import React from 'react';
import './ChallengeHistory.css';

const ChallengeHistory = ({ challenges }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusIcon = (challenge) => {
        if (challenge.is_completed) return '🏆';
        if (challenge.is_failed) return '💔';
        if (challenge.quit_date) return '🚪';
        return '⏸️';
    };

    const getStatusText = (challenge) => {
        if (challenge.is_completed) return 'Completed';
        if (challenge.is_failed) return 'Failed';
        if (challenge.quit_date) return 'Quit';
        return 'Inactive';
    };

    const getStatusClass = (challenge) => {
        if (challenge.is_completed) return 'completed';
        if (challenge.is_failed) return 'failed';
        if (challenge.quit_date) return 'quit';
        return 'inactive';
    };

    const calculateCompletionRate = (challenge) => {
        if (!challenge.progress_entries) return 0;
        return Math.round((challenge.progress_entries.length / challenge.challenge.duration_days) * 100);
    };

    if (challenges.length === 0) {
        return (
            <div className="challenge-history">
                <div className="no-history">
                    <p>No challenge history yet.</p>
                    <p>Complete some challenges to see your progress here!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="challenge-history">
            <div className="history-list">
                {challenges.map((userChallenge) => (
                    <div key={userChallenge.id} className={`history-item ${getStatusClass(userChallenge)}`}>
                        <div className="history-header">
                            <div className="challenge-info">
                                <span className="status-icon">{getStatusIcon(userChallenge)}</span>
                                <h4>{userChallenge.challenge.title}</h4>
                            </div>
                            <div className="status-info">
                                <span className={`status-text ${getStatusClass(userChallenge)}`}>
                                    {getStatusText(userChallenge)}
                                </span>
                            </div>
                        </div>

                        <div className="history-details">
                            <div className="date-info">
                                <span className="start-date">
                                    Started: {formatDate(userChallenge.start_date)}
                                </span>
                                {userChallenge.completion_date && (
                                    <span className="end-date">
                                        Completed: {formatDate(userChallenge.completion_date)}
                                    </span>
                                )}
                                {userChallenge.quit_date && (
                                    <span className="quit-date">
                                        Quit: {formatDate(userChallenge.quit_date)}
                                    </span>
                                )}
                            </div>

                            <div className="progress-info">
                                <div className="completion-stats">
                                    <span>
                                        {userChallenge.progress_entries ? userChallenge.progress_entries.length : 0} / {userChallenge.challenge.duration_days} days
                                    </span>
                                    <span className="completion-rate">
                                        ({calculateCompletionRate(userChallenge)}%)
                                    </span>
                                </div>
                                
                                <div className="progress-bar-small">
                                    <div 
                                        className="progress-fill-small" 
                                        style={{ width: `${calculateCompletionRate(userChallenge)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="challenge-description">
                            <p>{userChallenge.challenge.description}</p>
                        </div>

                        {userChallenge.is_completed && userChallenge.challenge.badge && (
                            <div className="earned-badge">
                                <span className="badge-earned-text">Badge Earned:</span>
                                <div className="badge-info">
                                    {userChallenge.challenge.badge.icon_url ? (
                                        <img src={userChallenge.challenge.badge.icon_url} alt={userChallenge.challenge.badge.title} />
                                    ) : (
                                        <span className="default-badge">🏅</span>
                                    )}
                                    <span>{userChallenge.challenge.badge.title}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChallengeHistory;