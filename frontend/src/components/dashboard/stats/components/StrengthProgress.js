import React, { useState, useEffect } from 'react';
import { useUser } from '../../../player/UserContext';
import axiosInstance from '../../../../axios';
import { baseUrl } from '../../../../config/apiConfig';
import ExerciseAnalyticsView from './views/ExerciseAnalyticsView';
import WorkoutLogView from './views/WorkoutLogView';
import './StrengthProgress.css';

const StrengthProgress = () => {
  const [view, setView] = useState('overall');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [workoutData, setWorkoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) {
      fetchWorkoutData();
    }
  }, [user?.id]);

  const processWorkoutData = (rawData) => {
    // Group exercises by name
    const exerciseMap = new Map();
    
    rawData.forEach(entry => {
      if (!exerciseMap.has(entry.exercise_name)) {
        exerciseMap.set(entry.exercise_name, {
          name: entry.exercise_name,
          sessions: []
        });
      }
      
      exerciseMap.get(entry.exercise_name).sessions.push({
        date: entry.session_date,
        volume: entry.total_volume,
        intensity: entry.avg_intensity,
        maxWeight: entry.max_weight,
        maxReps: entry.max_reps
      });
    });

    // Convert map to array and sort sessions by date
    const exercises = Array.from(exerciseMap.values()).map(exercise => ({
      ...exercise,
      sessions: exercise.sessions.sort((a, b) => new Date(a.date) - new Date(b.date))
    }));

    // Group by date to create sessions view
    const sessionMap = new Map();
    rawData.forEach(entry => {
      const date = new Date(entry.session_date).toISOString().split('T')[0];
      if (!sessionMap.has(date)) {
        sessionMap.set(date, {
          date: date,
          exercises: []
        });
      }
      
      sessionMap.get(date).exercises.push({
        name: entry.exercise_name,
        volume: entry.total_volume,
        intensity: entry.avg_intensity,
        maxWeight: entry.max_weight,
        maxReps: entry.max_reps
      });
    });

    return {
      exercises: exercises,
      sessions: Array.from(sessionMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  };

  const fetchWorkoutData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`${baseUrl}/users/${user.id}/workout-progress`);
      
      console.log('Raw workout data:', response.data);  // Debug log
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid data received from server');
      }

      const processedData = processWorkoutData(response.data);
      console.log('Processed workout data:', processedData);  // Debug log
      
      setWorkoutData(processedData);
      
      if (processedData.exercises.length > 0) {
        setSelectedExercise(processedData.exercises[0].name);
      }
    } catch (error) {
      console.error('Error fetching workout data:', error);
      setError(error.message || 'Failed to load workout data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="arcade-text">Loading strength data...</div>;
  if (error) return <div className="arcade-text">{error}</div>;
  if (!workoutData || !workoutData.exercises || workoutData.exercises.length === 0) {
    return <div className="arcade-text">NO STRENGTH DATA AVAILABLE</div>;
  }

  return (
    <div className="arcade-card strength-progress">
      <div className="arcade-header">STRENGTH</div>
      <div className="view-toggle">
        <button 
          onClick={() => setView('overall')} 
          className={`neon-button ${view === 'overall' ? 'active' : ''}`}
        >
          Overall Progress
        </button>
        <button 
          onClick={() => setView('log')} 
          className={`neon-button ${view === 'log' ? 'active' : ''}`}
        >
          Workout Log
        </button>
      </div>
      {view === 'overall' ? (
        <ExerciseAnalyticsView 
          data={workoutData} 
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
        />
      ) : (
        <WorkoutLogView data={workoutData} />
      )}
    </div>
  );
};

export default StrengthProgress;