import React, { useState } from "react";

const ActionLogger = ({ onActionLogged }) => {
    const [action, setAction] = useState('');
    const [xp, setXp] = useState(0);

    const handleSubmit = (event) => {
        event.preventDefault();
        // Validate inputs and update user's stats
        onActionLogged(action, xp);
        // Reset form
        setAction('');
        setXp(0);
    };

    return (
        <form onSubmit={handleSubmit}>
            <label> 
                Action:
                <select value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="exercise">Exercise</option>
                <option value="study">Study</option>
                <option value="meditate">Meditate</option>
              {/* Add more actions as needed */}
                </select>
            </label>
            <label>
                XP Earned:
                <input type="number" value={xp} onChange={(e) => setXp(e.target.value)} />
            </label>
            <button type="submit">Log Action</button>
        </form>
    );
}

export default ActionLogger;