import React from 'react';
import PropTypes from 'prop-types'
import './PlayerCard.css'

const PlayerCard = ({ playerData }) => {
  const { avatar, first_name, last_name, city, occupation, skills } = playerData;

  const renderStatBar = (skill) => {
    const percentage = (skill.xp / skill.maxXP) * 100; // Adjust according to actual skill data structure
    const skillName = skill.name.charAt(0).toUpperCase() + skill.name.slice(1);
    return (
      <div className="stat-bar-container" key={skill.name}>
        <label>{`${skillName} (Level ${skill.level})`}</label>
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="player-card">
      <img className="avatar" src={avatar} alt={`${first_name}'s avatar`} />
      <h3>{`${first_name} ${last_name}`}</h3>
      <p>Region: {city}</p>
      <p>Occupation: {occupation}</p>
      <div className="player-stats">
        {skills && skills.map(renderStatBar)}
      </div>
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
