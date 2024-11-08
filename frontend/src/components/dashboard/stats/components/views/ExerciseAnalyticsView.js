import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './ExerciseAnalyticsView.css';

const OverallProgressView = ({ data, selectedExercise, setSelectedExercise }) => {
  if (!data || !data.exercises) return null;

  const exerciseData = data.exercises.find(e => e.name === selectedExercise);
  if (!exerciseData) return null;

  // Calculate stats
  const stats = exerciseData.sessions.reduce((acc, session) => {
    return {
      maxWeight: Math.max(acc.maxWeight, session.maxWeight || 0),
      maxReps: Math.max(acc.maxReps, session.maxReps || 0),
      totalVolume: acc.totalVolume + (session.volume || 0),
      totalIntensity: acc.totalIntensity + (session.intensity || 0)
    };
  }, { maxWeight: 0, maxReps: 0, totalVolume: 0, totalIntensity: 0 });

  // Calculate average intensity
  const sessionLength = exerciseData.sessions.length;
  const avgVolume = stats.totalVolume / sessionLength
  const avgIntensity = stats.totalIntensity / sessionLength;

  // Format data for chart
  const chartData = exerciseData.sessions.map(session => ({
    date: new Date(session.date).toLocaleDateString(),
    volume: session.volume,
    intensity: session.intensity,
    weight: session.maxWeight,
    reps: session.maxReps
  }));

  return (
    <div className="overall-progress-view">
      <div className="exercise-selector">
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
        >
          {data.exercises.map(exercise => (
            <option key={exercise.name} value={exercise.name}>
              {exercise.name}
            </option>
          ))}
        </select>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">MAX WEIGHT</div>
          <div className="stat-value">{stats.maxWeight} LBS</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">MAX REPS</div>
          <div className="stat-value">{stats.maxReps}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">AVG VOLUME</div>
          <div className="stat-value">{avgVolume.toLocaleString()} LBS</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">AVG INTENSITY</div>
          <div className="stat-value">{Math.round(avgIntensity).toLocaleString()}</div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey="date" 
              stroke="#00ff00"
            />
            <YAxis stroke="#00ff00" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#000', 
                border: '1px solid #00ff00',
                color: '#00ff00'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="volume" 
              stroke="#ff00ff" 
              name="Volume" 
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#00ffff" 
              name="Weight" 
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="intensity" 
              stroke="#ffff00" 
              name="Intensity" 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OverallProgressView;