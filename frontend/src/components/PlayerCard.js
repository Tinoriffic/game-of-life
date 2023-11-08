import React from 'react';
import PropTypes from 'prop-types'
import './PlayerCard.css'

const PlayerCard = ({ playerData }) => {
    const { avatar, name, region, occupation, stats } = playerData;

    // Function to calculate the width of the progress bar based on the stat value
    const renderStatBar = (statName, level, currXP, maxXP) => {
        const percentage = (currXP / maxXP) * 100;
        statName = statName.charAt(0).toUpperCase() + statName.slice(1);
        return (
          <div className="stat-bar-container">
            <label>{`${statName} (Level ${level})`}</label>
            <div className="stat-bar">
              <div className="stat-bar-fill" style={{ width: `${percentage}%` }}></div>
            </div>
          </div>
        );
      };

    return (
      <div className="player-card">
        <img className="avatar" src={avatar} alt={`${name}'s avatar`} />
        <h3>{name}</h3>
        <p>Region: {region}</p>
        <p>Occupation: {occupation}</p>
        {/* Progress bars for stats */}
        <div className="player-stats">
            {Object.entries(playerData.stats).map(([statName, statData]) =>
                renderStatBar(statName, statData.level, statData.currXP, statData.maxXP)
        )}</div>
      </div>
    );
  };

  PlayerCard.propTypes = {
    playerData: PropTypes.shape({
        avatar: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        region: PropTypes.string.isRequired,
        occupation: PropTypes.string.isRequired,
        stats: PropTypes.shape({
            level: PropTypes.number.isRequired,
            currXP: PropTypes.number.isRequired,
            maxXP: PropTypes.number.isRequired,
        }).isRequired,
    }).isRequired,
  };

  export default PlayerCard;
