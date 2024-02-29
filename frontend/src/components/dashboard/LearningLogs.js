import React, { useState } from 'react';
import axiosInstance from '../../axios';
import { baseUrl } from '../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../player/UserContext';
import BackButton from '../common/BackButton';
import './LearningLogs.css';

export const LearningLogs = () => {
    const { user } = useUser();
    const [activityType, setActivityType] = useState('read');
    const [duration, setDuration] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const logEntry = {
            user_id: user.id,
            activity_type: activityType,
            duration: duration
        };

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            alert('Learning session logged successfully');
            setDuration('');
            setDescription('');
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging learning session: ', error);
            setError('Failed to log learning session. Please try again.');
        }
    };

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
        <button onClick={handleSubmit} className="log-learning-btn">
        Log Session
        </button>
        <BackButton />
        {error && <div className="error-message">{error}</div>}
    </div>
    );
};

export default LearningLogs;
