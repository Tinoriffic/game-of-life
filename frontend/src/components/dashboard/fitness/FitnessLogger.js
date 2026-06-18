import React from 'react';
import './FitnessLogger.css';
import WorkoutPrograms from './workouts/WorkoutPrograms';

/**
 * Repurposed in v1.0.0: the standalone weight tracker and running/cardio loggers are
 * deprecated (weight = the Weigh-in measurement habit; running = the Cardio habit).
 * This surface is now just the workout program builder + per-set logger.
 */
const FitnessLogger = () => {
  return (
    <div className="fitness-page">
      <WorkoutPrograms />
    </div>
  );
};

export default FitnessLogger;
