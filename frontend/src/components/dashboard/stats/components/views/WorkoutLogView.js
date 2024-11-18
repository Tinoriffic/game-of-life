import React, { useState } from 'react';

const WorkoutLogView = ({ data }) => {
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  const currentSession = data.exercises[currentSessionIndex];

  const handlePreviousSession = () => {
    setCurrentSessionIndex(prev => Math.max(prev - 1, 0));
  };

  const handleNextSession = () => {
    setCurrentSessionIndex(prev => Math.min(prev + 1, data.exercises.length - 1));
  };

  const calculateTotalIntensityScore = (sets) => {
    return sets.reduce((total, set) => total + (set.weight * (1 + (set.reps / 30))), 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!currentSession) {
    return <div className="arcade-text">NO WORKOUT LOG AVAILABLE</div>;
  }

  return (
    <div className="workout-log-view">
      <div className="session-navigation">
        <button onClick={handlePreviousSession} disabled={currentSessionIndex === 0}>
          &lt; Previous Session
        </button>
        <h2>{formatDate(currentSession.progressData[0].date)}</h2>
        <button onClick={handleNextSession} disabled={currentSessionIndex === data.exercises.length - 1}>
          Next Session &gt;
        </button>
      </div>
      <div className="exercise-list">
        {currentSession.progressData.map((exercise, index) => {
          const totalVolume = exercise.volume;
          const totalIntensityScore = calculateTotalIntensityScore(exercise.sets);
          
          return (
            <div key={index} className="exercise-item">
              <h3>{exercise.name}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Set</th>
                    <th>Weight (lbs)</th>
                    <th>Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set, setIndex) => (
                    <tr key={setIndex}>
                      <td>{setIndex + 1}</td>
                      <td>{set.weight}</td>
                      <td>{set.reps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="exercise-totals">
                <p>Total Volume: {totalVolume} lbs</p>
                <p>Intensity Score: {totalIntensityScore.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutLogView;