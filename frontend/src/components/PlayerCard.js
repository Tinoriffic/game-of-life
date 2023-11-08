import React from 'react';
import PropTypes from 'prop-types'
import './PlayerCard.css'

const PlayerCard = ({ playerData }) => {
    return (
      <div className="player-card">
        <img className="avatar" src={playerData.avatar} alt={`${playerData.name}'s avatar`} />
        <h3>{playerData.name}</h3>
        <p>Region: {playerData.region}</p>
        <p>Occupation: {playerData.occupation}</p>
        {/* Add player stats here later */}
      </div>
    );
  };

  PlayerCard.propTypes = {
    playerData: PropTypes.shape({
        avatar: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        region: PropTypes.string.isRequired,
        occupation: PropTypes.string.isRequired
    }).isRequired,
  };

  export default PlayerCard;
