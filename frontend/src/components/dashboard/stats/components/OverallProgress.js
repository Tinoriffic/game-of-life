import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './OverallProgress.css';

const OverallProgress = ({ data }) => {
  const { level, xp, xpToNextLevel, daysActive, activityStreak } = data;
  const progress = (xp / xpToNextLevel) * 100;

  return (
    <div className="arcade-card overall-progress">
      <div className="arcade-header">OVERALL</div>
      <div className="progress-container">
        <div className="level-progress">
          <CircularProgressbar
            value={progress}
            text={`LVL ${level}`}
            styles={buildStyles({
              textColor: '#FFD700',
              pathColor: '#4caf50',
              trailColor: 'rgba(255, 255, 255, 0.1)',
              textSize: '16px',
            })}
          />
        </div>
        <div className="progress-details">
          <div className="xp-info">
            <div className="stat-item">
              <span className="stat-label">CURRENT XP</span>
              <span className="stat-value">{xp}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">XP TO NEXT</span>
              <span className="stat-value">{xpToNextLevel - xp}</span>
            </div>
          </div>
          <div className="activity-info">
            <div className="stat-item">
              <span className="stat-label">DAYS ACTIVE</span>
              <span className="stat-value">{daysActive}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">STREAK</span>
              <span className="stat-value">{activityStreak} DAYS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallProgress;