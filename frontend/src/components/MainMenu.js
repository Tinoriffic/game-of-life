import React from 'react';
import './MainMenu.css'
import PlayerCard from './PlayerCard';

function MainMenu() {
  return (
    <div className="main-screen">
      <header className="main-header">
        <h1>Game of Life</h1>
      </header>
      <nav className="main-nav">
        <ul>
          <li>Player Card</li>
          <li>Skill Tree</li>
          <li>Milestones</li>
          <li>Stats</li>
        </ul>
      </nav>
      <section className="player-card">
      <PlayerCard playerData={yourPlayerData} />
      </section>
      <section className="skill-tree">
      <p className="funny">XYZ Counter: 9 Days</p>
      <p><b>🏆 Achievement Unlocked: "Iron Will" 🏆</b></p>
      </section>
      {/* Add more sections as needed */}
    </div>
  );
}

// TODO: Adjust this get the current user's data and if unable to, some default settings
const yourPlayerData = {
  avatar: 'https://th.bing.com/th/id/OIG.EpsJXjL4FVpp8UnVU.OV?pid=ImgGn',
  name: 'Faustino',
  region: 'Boston',
  occupation: 'Software Engineer',
  stats: {
    mindfulness: {
      level: 2,
      currXP: 30,
      maxXP: 100
    },
    strength: {
      level: 1,
      currXP: 70,
      maxXP: 100
    },
    charisma: {
      level: 1,
      currXP: 50,
      maxXP: 100
    },
    intelligence: {
      level: 1,
      currXP: 40,
      maxXP: 100
    }
  }
};


export default MainMenu;
