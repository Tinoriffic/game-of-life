import React, { useState } from 'react';
import axiosInstance from '../../../axios';
import { baseUrl } from '../../../config/apiConfig';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../player/UserContext';
import BackButton from '../../common/BackButton';
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

    const handleNextExercise = () => {
        setExerciseIndex((prevIndex) => (prevIndex + 1) % meditationExercises.length);
    };

    const toggleExercisesPanel = () => {
        setShowExercises(!showExercises);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const logEntry = {
            user_id: user.id,
            activity_type: "meditate",
            duration: duration
        };

        try {
            await axiosInstance.post(`${baseUrl}/users/${user.id}/log-activity/`, logEntry);
            alert('Meditation logged successfully');
            setDuration('');
            setError('');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error logging meditation: ', error);
            setError('Failed to log meditation. Please try again.');
        }
    };

    return (
    <div className="meditation-logs">
        <input
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        placeholder="Duration in minutes"
        className="duration-input"
        />
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
