import React, { useState } from 'react';
import axiosInstance from '../../../../axios';
import { baseUrl } from '../../../../config/apiConfig';
import { useUser } from '../../../player/UserContext';
import { useYesterdayLogging, parseApiError } from '../../../../hooks/useYesterdayLogging';
import './CardioLogs.css';

const CardioLog = () => {
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const { user } = useUser(); // Get the current user's ID from context

  // Use custom hook for yesterday logging functionality
  const { canLogYesterday, logForYesterday, setLogForYesterday, loading, getLogEntry } = useYesterdayLogging(user.id, 'run');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!distance || !duration) {
      console.error('Both distance and duration are required');
      return;
    }

    const baseEntry = {
        activity_type: "run",
        description: description,
        duration: duration,
        distance: distance
    };

    // Use helper to add date if logging for yesterday
    const runEntry = getLogEntry(baseEntry);

    try {
        await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, runEntry);
        setDistance('');
        setDuration('');
        setDescription('');
        setLogForYesterday(false);
        setError('');
        const dayText = logForYesterday ? 'yesterday' : 'today';
        console.log(`Cardio activity logged successfully for ${dayText}`);
    } catch (error) {
        console.error('Error logging cardio activity: ', error);
        setError(parseApiError(error, 'Failed to log cardio activity. Please try again.'));
    }
  };

  if (loading) {
    return <div className="cardio-log">Loading...</div>;
  }

  return (
    <div className="cardio-log">
      <h2>Log Running Session</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Distance (miles):</label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Duration (minutes):</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
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
        <button type="submit">Log Run</button>
      </form>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default CardioLog;
