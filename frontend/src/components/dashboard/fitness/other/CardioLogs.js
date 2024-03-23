import React, { useState } from 'react';
import axiosInstance from '../../../../axios';
import { baseUrl } from '../../../../config/apiConfig';
import { useUser } from '../../../player/UserContext';
import './CardioLogs.css';

const CardioLog = () => {
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const { user } = useUser(); // Get the current user's ID from context

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!distance || !duration) {
      console.error('Both distance and duration are required');
      return;
    }

    const runEntry = {
        activity_type: "run",
        description: description,
        duration: duration,
        distance: distance
    };

    try {
        await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, runEntry);
        setDistance('');
        setDuration('');
        setDescription('');
        setError('');
        console.log('Cardio activity logged successfully');
    } catch (error) {
        console.error('Error logging cardio activity: ', error);
        setError('Failed to log cardio activity. Please try again.');
    } 
  };

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
        <button type="submit">Log Run</button>
      </form>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default CardioLog;
