import React from 'react';
import './SkillsProgress.css';

const SkillsProgress = ({ data }) => {
  if (!data || data.length === 0) return <div className="arcade-text">NO SKILLS DATA AVAILABLE</div>;

  const getSkillColor = (skillName) => {
    const colors = {
      'Strength': '#00ff00',
      'Endurance': '#00ff00',
      'Intelligence': '#00ff00',
      'Charisma': '#00ff00',
      'Wisdom': '#00ff00',
      'Awareness': '#00ff00'
    };
    return colors[skillName] || '#ffffff';
  };

  return (
    <div className="arcade-card skills-progress">
      <div className="arcade-header">SKILLS PROGRESS</div>
      <div className="skills-grid">
        {data.map((skill) => (
          <div key={skill.name} className="skill-item">
            <div className="skill-header">
              <span className="skill-name">{skill.name}</span>
              <span className="skill-level">LVL {skill.level}</span>
            </div>
            <div className="skill-bar-container">
              <div 
                className="skill-bar" 
                style={{ 
                  width: `${(skill.xp / (skill.xp + skill.xpToNextLevel)) * 100}%`,
                  backgroundColor: getSkillColor(skill.name)
                }}
              ></div>
            </div>
            <div className="skill-xp">
              <span>{skill.xp} / {skill.xp + skill.xpToNextLevel} XP</span>
              <span>{((skill.xp / (skill.xp + skill.xpToNextLevel)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillsProgress;