import React from 'react';
import { useNavigate } from 'react-router-dom';

const ActivityLogger = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="activity-logger">
            <h2>Log an Activity</h2>
            <div className="activity-options">
                <button onClick={() => navigate('/log-social-activity')}>Social</button>
                <button onClick={() => {/* Navigate to specific activity logging page */}}>Journaling</button>
                <button onClick={() => {/* Navigate to specific activity logging page */}}>Meditation</button>
                <button onClick={() => {/* Navigate to specific activity logging page */}}>Learning</button>
            </div>
            <button className="back-button" onClick={handleBack}>Back</button>
        </div>
    );
};

export default ActivityLogger;