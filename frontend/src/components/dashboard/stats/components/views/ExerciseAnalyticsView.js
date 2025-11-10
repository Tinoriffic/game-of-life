import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './ExerciseAnalyticsView.css';

const ExerciseAnalyticsView = ({ data, selectedExercise, setSelectedExercise }) => {
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
    <div className="exercise-analytics-view">
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
              stroke="#B8B8B8"
            />
            <YAxis stroke="#B8B8B8" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 215, 0, 0.5)',
                color: '#F8F8F2'
              }}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#4caf50"
              name="Volume"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#FFD700"
              name="Weight"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke="#2196F3"
              name="Intensity"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExerciseAnalyticsView;