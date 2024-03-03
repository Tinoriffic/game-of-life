import React, { useState } from 'react';
import axiosInstance from '../../axios';
import { baseUrl } from '../../config/apiConfig';
import { useUser } from '../player/UserContext';
import './WeightTracking.css';

const WeightTracking = () => {
    const { user } = useUser();
    const [weightLogs, setWeightLogs] = useState([]);
    const [weightGoal, setWeightGoal] = useState(null);
    const [weight, setWeight] = useState('');
    const [error, setError] = useState('');

    const fetchWeightLogs = async () => {
        try {
            const response = await axiosInstance.get(`${baseUrl}/users/${user.id}/weight/logs`);
            setWeightLogs(response.data);
            setWeightGoal(response.data.weightGoal);
            setError('');
            console.log("Successfully fetched weight logs.");
        } catch (error) {
            console.error('Error fetching weight entries: ', error);
            setError('Failed to fetch weight entries. Please try again.');
        }  
    };

    const logWeight = async () => {

        const date = new Date().toISOString().split('T')[0];

        const weightEntry = {
            weight: weight,
            weight_goal: weightGoal, // TODO: Only updated if modifying the weight goal
            date: date
        };

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/track-weight`, weightEntry);
            setWeight('');
            console.log("Successfully logged weight.");
            fetchWeightLogs();
        } catch (error) {
            console.error('Error logging weight entry: ', error);
            setError('Failed to log weight entry. Please try again.');
        }
    };

    return (
        <div className="weight-tracking">
            <h2>Weight Tracking</h2>
            {!weightLogs.length && (
                <p>Please log your starting weight:</p>
            )}
            <div className="weight-inputs">
                <input
                    type="number"
                    placeholder="Your weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                />
                <input
                    type="number"
                    value={weightGoal}
                    onChange={(e) => setWeightGoal(e.target.value)}
                    placeholder="Enter your goal weight"
                />
                <button onClick={logWeight}>Log Weight</button>
            </div>
            {weightLogs.length > 0 && (
                <div>
                    <h3>Recent Weight Logs</h3>
                    {/* Render weight logs */}
                    {weightLogs.map((log, index) => (
                        <div key={index}>
                            <p>Date: {new Date(log.date).toLocaleDateString()}</p>
                            <p>Weight: {log.weight} lbs</p>
                        </div>
                    ))}
                </div>
            )}
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default WeightTracking;