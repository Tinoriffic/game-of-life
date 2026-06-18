import React, { useState } from 'react';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
import { useYesterdayLogging, parseApiError } from '../../../hooks/useYesterdayLogging';
import './SocialLogs.css';

const SocialLogs = () => {
    const { user } = useUser();
    const [interactionType, setInteractionType] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const socialInteractions = [
        { value: "social_gathering", label: "Attended a Social Gathering" },
        { value: 'presentation', label: 'Gave a Presentation' },
        { value: 'approach_stranger', label: 'Approached a Stranger' },
        { value: 'give_compliment', label: 'Gave a Compliment' },
        { value: 'tell_story', label: 'Told a Story' },
        { value: 'make_laugh', label: 'Made Someone Laugh' },
      ];

    // Use custom hook for yesterday logging functionality
    const { canLogYesterday, logForYesterday, setLogForYesterday, loading, getLogEntry } = useYesterdayLogging(user.id, 'socialize');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const baseEntry = {
            user_id: user.id,
            activity_type: "socialize",
            description: interactionType,
            notes: notes
        };

        // Use helper to add date if logging for yesterday
        const logEntry = getLogEntry(baseEntry);

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            const dayText = logForYesterday ? 'yesterday' : 'today';
            alert(`Social activity logged successfully for ${dayText}`);
            setInteractionType('');
            setNotes('');
            setLogForYesterday(false);
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging social activity: ', error);
            setError(parseApiError(error, 'Failed to log social activity. Please try again.'));
        }
    };

    if (loading) {
        return <div className="social-logs-container">Loading...</div>;
    }

    return (
        <div className="social-logs-container">
          <form onSubmit={handleSubmit} className="social-logs-form">
            <h2>Log a Social Activity</h2>
            <div className="form-group">
              <label htmlFor="interactionType">Type of Interaction:</label>
              <select
                id="interactionType"
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                required
              >
                <option value="">Select Interaction Type</option>
                {socialInteractions.map((interaction) => (
                  <option key={interaction.value} value={interaction.value}>
                    {interaction.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes (optional):</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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
            <button type="submit" className="submit-btn">Log Activity</button>
            <BackButton />
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
      );
    };

export default SocialLogs;
