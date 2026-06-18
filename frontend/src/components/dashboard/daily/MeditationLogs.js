import React, { useState } from 'react';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
import { useYesterdayLogging, parseApiError } from '../../../hooks/useYesterdayLogging';
import './MeditationLogs.css';

const meditationExercises = [
    { title: "Mindfulness Meditation", directions: "Focus on your breath and observe your thoughts without judgment." },
    { title: "Focused Meditation", directions: "Concentrate on a single object, sound, or visual element." },
    { title: "Body Scan Meditation", directions: "Pay attention to different parts of your body and notice any sensations you feel." },
    { title: "Loving-Kindness Meditation", directions: "Direct feelings of love and kindness towards yourself and others." },
    { title: "Transcendental Meditation", directions: "Use a mantra and focus your attention to transcend your current state." },
];

export const MeditationLogs = () => {
    const { user } = useUser();
    const [duration, setDuration] = useState('');
    const [showExercises, setShowExercises] = useState(false);
    const [exerciseIndex, setExerciseIndex] = useState(0);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Use custom hook for yesterday logging functionality
    const { canLogYesterday, logForYesterday, setLogForYesterday, loading, getLogEntry } = useYesterdayLogging(user.id, 'meditate');

    const handleNextExercise = () => {
        setExerciseIndex((prevIndex) => (prevIndex + 1) % meditationExercises.length);
    };

    const toggleExercisesPanel = () => {
        setShowExercises(!showExercises);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const baseEntry = {
            user_id: user.id,
            activity_type: "meditate",
            duration: duration
        };

        // Use helper to add date if logging for yesterday
        const logEntry = getLogEntry(baseEntry);

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            const dayText = logForYesterday ? 'yesterday' : 'today';
            alert(`Meditation logged successfully for ${dayText}`);
            setDuration('');
            setLogForYesterday(false);
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging meditation: ', error);
            setError(parseApiError(error, 'Failed to log meditation. Please try again.'));
        }
    };

    if (loading) {
        return <div className="meditation-logs">Loading...</div>;
    }

    return (
    <div className="meditation-logs">
        <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Duration in minutes"
        className="duration-input"
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
        <button onClick={handleSubmit} className="log-meditation-btn">
        Log Meditation
        </button>
        <button onClick={toggleExercisesPanel} className="see-exercises-btn">
        {showExercises ? "Hide Exercises" : "Sample Exercises"}
        </button>
        {showExercises && (
        <div className="meditation-exercise">
            <h4>{meditationExercises[exerciseIndex].title}</h4>
            <p>{meditationExercises[exerciseIndex].directions}</p>
            <button onClick={handleNextExercise} className="next-exercise-btn">
            Next Exercise
            </button>
        </div>
        )}
        <BackButton />
        {error && <div className="error-message">{error}</div>}
    </div>
    );
};

export default MeditationLogs;
