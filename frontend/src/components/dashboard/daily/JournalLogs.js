import React, { useState } from 'react';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
import { useYesterdayLogging, parseApiError } from '../../../hooks/useYesterdayLogging';
import './JournalLogs.css';

export const JournalLogs = () => {
    const { user } = useUser();
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const reflectionPrompts = [
        "Think about one good thing that happened today.",
        "Take a deep breath and hold it for a moment.",
        "Consider what you're grateful for right now.",
      ];

    // Use custom hook for yesterday logging functionality
    const { canLogYesterday, logForYesterday, setLogForYesterday, loading, getLogEntry } = useYesterdayLogging(user.id, 'journal');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const baseEntry = {
            user_id: user.id,
            activity_type: "journal"
        };

        // Use helper to add date if logging for yesterday
        const logEntry = getLogEntry(baseEntry);

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            const dayText = logForYesterday ? 'yesterday' : 'today';
            alert(`Journal entry logged successfully for ${dayText}`);
            setLogForYesterday(false);
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging Journal entry: ', error);
            setError(parseApiError(error, 'Failed to log Journal entry. Please try again.'));
        }
    };

    if (loading) {
        return <div className="journal-logs">Loading...</div>;
    }

  return (
    <div className="journal-logs">
      <div className="reflection-prompts">
      {reflectionPrompts.map((prompt, index) => (
        <div key={index} className="prompt">{prompt}</div>
        ))}
        </div>
      {canLogYesterday && (
        <div className="yesterday-option">
            <label>
                <input
                    type="checkbox"
                    checked={logForYesterday}
                    onChange={(e) => setLogForYesterday(e.target.checked)}
                />
                <span>Forgot to log yesterday?</span>
            </label>
            {logForYesterday && <span className="date-indicator">Logging for yesterday</span>}
        </div>
      )}
      <button onClick={handleSubmit} className='log-journal-btn'>
        I journaled today
      </button>
      <BackButton />
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default JournalLogs;
