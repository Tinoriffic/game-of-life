import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../../axios';
import { baseUrl } from '../../../../config/apiConfig';
import { useUser } from '../../../player/UserContext';
import { parseApiError } from '../../../../hooks/useYesterdayLogging';
import './WeightTracking.css';

const WeightTracking = () => {
    const { user } = useUser();
    const [weightLogs, setWeightLogs] = useState([]);
    const [weightGoal, setWeightGoal] = useState(null);
    const [weight, setWeight] = useState('');
    const [error, setError] = useState('');
    const [todaysWeight, setTodaysWeight] = useState(null);
    const [latestWeightGoal, setLatestWeightGoal] = useState(null);
    const [logForYesterday, setLogForYesterday] = useState(false);
    const [canLogYesterday, setCanLogYesterday] = useState(false);

    useEffect(() => {
        fetchWeightLogs();
    }, []);

    const fetchWeightLogs = async () => {
        try {
            const response = await axiosInstance.get(`${baseUrl}/users/${user.id}/weight/logs/`);
            console.log(response.data);
            setWeightLogs(response.data.logs);
            setLatestWeightGoal(response.data.latestWeightGoal);

            // Check if there's an entry for today
            const today = new Date().toISOString().split('T')[0];
            const todaysEntry = response.data.logs.find(log => log.date.startsWith(today));
            if (todaysEntry) {
                setTodaysWeight(todaysEntry.weight);
            }

            // Check if there's an entry for yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDateStr = yesterday.toISOString().split('T')[0];
            const yesterdaysEntry = response.data.logs.find(log => log.date.startsWith(yesterdayDateStr));
            setCanLogYesterday(!yesterdaysEntry);

            setError('');
        } catch (error) {
            console.error('Error fetching weight entries: ', error);
            setError('Failed to fetch weight entries. Please try again.');
        }
    };

    const logWeight = async () => {
        // Calculate the date based on whether logging for yesterday
        let date;
        if (logForYesterday) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            date = yesterday.toISOString().split('T')[0];
        } else {
            date = new Date().toISOString().split('T')[0];
        }

        // Check if there's already an entry for the selected date
        const existingEntry = weightLogs.find(log => log.date.startsWith(date));

        if (existingEntry) {
            const dayText = logForYesterday ? 'yesterday' : 'today';
            const confirmOverwrite = window.confirm(`You've already logged your weight for ${dayText}. Are you sure you want to overwrite it?`);
            if (!confirmOverwrite) return;
        }

        const weightEntry = {
            weight: parseFloat(weight),
            weight_goal: weightGoal || latestWeightGoal,
            date: date
        };

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/track-weight`, weightEntry);
            setWeight('');
            setWeightGoal(null);
            setLogForYesterday(false);
            if (!logForYesterday) {
                setTodaysWeight(weightEntry.weight);
            }
            if (weightGoal) {
                setLatestWeightGoal(weightGoal);
            }
            const dayText = logForYesterday ? 'yesterday' : 'today';
            console.log(`Successfully logged weight for ${dayText}.`);
            fetchWeightLogs();
        } catch (error) {
            console.error('Error logging weight entry: ', error);
            setError(parseApiError(error, 'Failed to log weight entry. Please try again.'));
        }
    };

    return (
        <div className="weight-tracking">
            <h2>Weight Tracking</h2>
            {todaysWeight && (
                <p>Today's Weight: {todaysWeight} lbs</p>
            )}
            {latestWeightGoal && (
                <p>Weight Goal: {latestWeightGoal} lbs</p>
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
                    value={weightGoal || ''}
                    onChange={(e) => setWeightGoal(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Enter your goal weight"
                />
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
                <button onClick={logWeight}>Log Weight</button>
            </div>
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default WeightTracking;