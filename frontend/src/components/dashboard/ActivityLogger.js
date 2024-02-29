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
                <button onClick={() => navigate('/log-journal-entry')}>Journaling</button>
                <button onClick={() => navigate('/log-meditation')}>Meditation</button>
                <button onClick={() => navigate('/log-learning-session')}>Learning</button>
            </div>
            <button className="back-button" onClick={handleBack}>Back</button>
        </div>
    );
};

export default ActivityLogger;