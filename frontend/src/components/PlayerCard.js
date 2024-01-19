import React from 'react';
import PropTypes from 'prop-types'
import './PlayerCard.css'
import defaultAvatar from './default-avatar.png'

const PlayerCard = ({ playerData }) => {
  const { avatar, first_name, city, occupation, skills } = playerData;
  const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const renderStatBar = (skill) => {
    const maxXP = 100 * (skill.level * 1.5)
    const percentage = (skill.xp / maxXP) * 100; // Adjust according to actual skill data structure
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
      <img className="avatar" src={avatar || defaultAvatar} alt={`${first_name}'s avatar`} />
      <h3>{capitalizeFirstLetter(first_name)}</h3>
      <p>Region: {capitalizeFirstLetter(city)}</p>
      <p>Occupation: {capitalizeFirstLetter(occupation)}</p>
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
