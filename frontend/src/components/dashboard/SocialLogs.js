import React, { useState } from 'react';
import axiosInstance from '../../axios';
import { baseUrl } from '../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import './SocialLogs.css'

const SocialLogs = ({ userId }) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const logEntry = {
            user_id: userId,
            activity_type: "socialize",
            description: interactionType,
            notes: notes
        };

        try {
            await axiosInstance.post(`${baseUrl}/users/${userId}/log-activity/`, logEntry);
            alert('Social activity logged successfully');
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging social activity: ', error);
            setError('Failed to log social activity. Please try again.');
        }
    };

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
            <button type="submit" className="submit-btn">Log Activity</button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </div>
      );
    };

export default SocialLogs;
