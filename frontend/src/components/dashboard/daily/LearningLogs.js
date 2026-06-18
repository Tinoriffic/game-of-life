import React, { useState } from 'react';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
import { useYesterdayLogging, parseApiError } from '../../../hooks/useYesterdayLogging';
import './LearningLogs.css';

export const LearningLogs = () => {
    const { user } = useUser();
    const [activityType, setActivityType] = useState('read');
    const [duration, setDuration] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Use custom hook for yesterday logging functionality (tracks the currently selected activity type)
    const { canLogYesterday, logForYesterday, setLogForYesterday, loading, getLogEntry } = useYesterdayLogging(user.id, activityType);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const baseEntry = {
            user_id: user.id,
            activity_type: activityType,
            duration: duration
        };

        // Use helper to add date if logging for yesterday
        const logEntry = getLogEntry(baseEntry);

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            const dayText = logForYesterday ? 'yesterday' : 'today';
            alert(`Learning session logged successfully for ${dayText}`);
            setDuration('');
            setDescription('');
            setLogForYesterday(false);
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging learning session: ', error);
            setError(parseApiError(error, 'Failed to log learning session. Please try again.'));
        }
    };

    if (loading) {
        return <div className="learning-logs">Loading...</div>;
    }

    return (
    <div className="learning-logs">
        <select
        value={activityType}
        onChange={(e) => setActivityType(e.target.value)}
        className="activity-type-select"
        >
        <option value="read">Reading</option>
        <option value="take_class">Taking a Class</option>
        </select>
        <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Duration in minutes"
        className="duration-input"
        />
        <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Book or Course Name"
        className="description-textarea"
        ></textarea>
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
        <button onClick={handleSubmit} className="log-learning-btn">
        Log Session
        </button>
        <BackButton />
        {error && <div className="error-message">{error}</div>}
    </div>
    );
};

export default LearningLogs;
