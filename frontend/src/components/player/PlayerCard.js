import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types'
import './PlayerCard.css'
import defaultAvatar from '../../assets/default-avatar.png'
import { challengeService } from '../../services/challengeService'

const PlayerCard = ({ playerData }) => {
  const { avatar_url, first_name, city, occupation, skills } = playerData;
  const [badges, setBadges] = useState([]);
  const [hoveredBadge, setHoveredBadge] = useState(null);
  const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  //console.log("avatar_url", avatar_url)
  //console.log("badges", badges)

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const badgeData = await challengeService.getUserBadges();
      setBadges(badgeData.badges || []);
    } catch (err) {
      console.error('Error loading badges:', err);
      setBadges([]);
    }
  };

  const renderStatBar = (skill) => {
    const maxXP = 100 * (skill.level * 1.5)
    const percentage = (skill.xp / maxXP) * 100;
    const skillName = skill.name.charAt(0).toUpperCase() + skill.name.slice(1);
    //console.log(`${skillName}: ${skill.xp}/${maxXP} = ${percentage}%`);
    return (
      <div className="stat-item" key={skill.name}>
        <div className="stat-header">
          <span className="stat-name">{skillName}</span>
          <span className="stat-level">Lv.{skill.level}</span>
        </div>
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="player-card">
      {/* Character Header */}
      <div className="character-header">
        <div className="avatar-section">
          <img className="avatar" src={avatar_url || defaultAvatar} alt={`${first_name}'s avatar`} />
        </div>
        <div className="character-info">
          <h2 className="character-name">{capitalizeFirstLetter(first_name)}</h2>
          <div className="character-title">{capitalizeFirstLetter(occupation)}</div>
          <div className="character-location">📍 {capitalizeFirstLetter(city)}</div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <h3 className="stats-header">Attributes</h3>
        <div className="stats-grid">
          {skills && skills.map(renderStatBar)}
        </div>
      </div>
      
      {/* Badges Section */}
      {(
        <div className="badges-section">
          <div className="badges-header">
            🏆 Achievements
            <span className="badge-count">{badges.length}</span>
          </div>
          <div className="badges-container">
            {badges.map((userBadge) => (
              <div 
                key={userBadge.id}
                className="badge-item"
                onMouseEnter={() => setHoveredBadge(userBadge)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                {userBadge.badge.icon_url ? (
                  <img 
                    src={userBadge.badge.icon_url} 
                    alt={userBadge.badge.title}
                    className="badge-icon"
                  />
                ) : (
                  <div className="default-badge-icon">🏅</div>
                )}
                
                {hoveredBadge && hoveredBadge.id === userBadge.id && (
                  <div className="badge-tooltip">
                    <div className="badge-tooltip-title">{userBadge.badge.title}</div>
                    {userBadge.badge.description && (
                      <div className="badge-tooltip-description">
                        {userBadge.badge.description}
                      </div>
                    )}
                    <div className="badge-tooltip-date">
                      Earned: {new Date(userBadge.earned_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

  PlayerCard.propTypes = {
    playerData: PropTypes.shape({
        avatar_url: PropTypes.string,
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
