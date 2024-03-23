import React, { useState } from 'react';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const logEntry = {
            user_id: user.id,
            activity_type: "journal"
        };

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            alert('Journal entry logged successfully');
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging Journal entry: ', error);
            setError('Failed to log Journal entry. Please try again.');
        }
    };

  return (
    <div className="journal-logs">
      <div className="reflection-prompts">
      {reflectionPrompts.map((prompt, index) => (
        <div key={index} className="prompt">{prompt}</div>
        ))}
        </div>
      <button onClick={handleSubmit} className='log-journal-btn'>
        I journaled today
      </button>
      <BackButton />
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default JournalLogs;
