import React from 'react';
import WeightTracking from './WeightTracking';

const FitnessLogger = () => {
  return (
    <div className="fitness-page">
      <h1>Fitness Activities</h1>
      <WeightTracking />
      {/* Add other fitness components here */}
    </div>
  );
};

export default FitnessLogger;
