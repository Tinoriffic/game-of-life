import React, { useState, useEffect } from 'react';
import ChallengeLibrary from './ChallengeLibrary';
import ActiveChallenge from './ActiveChallenge';
import ChallengeHistory from './ChallengeHistory';
import { challengeService } from '../../../services/challengeService';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
import './ChallengesPage.css';

const ChallengesPage = () => {
    const { user, refreshUserData } = useUser();
    const [activeTab, setActiveTab] = useState('active');
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [availableChallenges, setAvailableChallenges] = useState([]);
    const [challengeHistory, setChallengeHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadChallengeData();
    }, []);

    const loadChallengeData = async () => {
        try {
            setLoading(true);
            setError('');

            const [activeData, availableData, historyData] = await Promise.all([
                challengeService.getActiveChallenge(),
                challengeService.getAvailableChallenges(),
                challengeService.getChallengeHistory()
            ]);

            setActiveChallenge(activeData.active_challenge);
            setAvailableChallenges(availableData.challenges);
            setChallengeHistory(historyData.challenges);
        } catch (err) {
            console.error('Error loading challenge data:', err);
            setError('Failed to load challenges. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChallengeJoined = async (newChallenge) => {
        setActiveChallenge(newChallenge);
        setActiveTab('active');
        await refreshUserData();
    };

    const handleChallengeCompleted = async () => {
        await loadChallengeData();
        await refreshUserData();
    };

    const handleChallengeQuit = async () => {
        setActiveChallenge(null);
        await loadChallengeData();
        await refreshUserData();
    };

    if (loading) {
        return (
            <div className="challenges-page">
                <BackButton />
                <div className="loading">Loading challenges...</div>
            </div>
        );
    }

    return (
        <div className="challenges-page">
            <BackButton />
            <div className="challenges-header">
                <h1>Challenges</h1>
                <div className="challenges-tabs">
                    <button 
                        className={activeTab === 'active' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('active')}
                    >
                        Active
                    </button>
                    <button 
                        className={activeTab === 'library' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('library')}
                    >
                        Available
                    </button>
                    <button 
                        className={activeTab === 'history' ? 'tab active' : 'tab'}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="challenges-content">
                {activeTab === 'active' && (
                    <ActiveChallenge 
                        activeChallenge={activeChallenge}
                        onChallengeCompleted={handleChallengeCompleted}
                        onChallengeQuit={handleChallengeQuit}
                    />
                )}
                
                {activeTab === 'library' && (
                    <ChallengeLibrary 
                        challenges={availableChallenges}
                        hasActiveChallenge={!!activeChallenge}
                        onChallengeJoined={handleChallengeJoined}
                    />
                )}
                
                {activeTab === 'history' && (
                    <ChallengeHistory 
                        challenges={challengeHistory}
                    />
                )}
            </div>
        </div>
    );
};

export default ChallengesPage;