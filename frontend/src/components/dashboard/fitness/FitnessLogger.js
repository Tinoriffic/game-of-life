import React from 'react';
import WeightTracking from './other/WeightTracking';
import CardioLogs from './other/CardioLogs';
import './FitnessLogger.css';
import WorkoutPrograms from './workouts/WorkoutPrograms';

const FitnessLogger = () => {
  return (
    <div className="fitness-page">
      <h1>Fitness Activities</h1>
      <WeightTracking />
      <CardioLogs />
      <WorkoutPrograms />
    </div>
  );
};

export default FitnessLogger;
