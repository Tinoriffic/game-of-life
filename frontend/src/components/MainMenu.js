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
        {/* Skill tree will go here */}
      </section>
      {/* Add more sections as needed */}
    </div>
  );
}

const yourPlayerData = {
  avatar: 'https://th.bing.com/th/id/OIG.EpsJXjL4FVpp8UnVU.OV?pid=ImgGn',
  name: 'Faustino',
  region: 'Boston',
  occupation: 'Software Engineer'
};


export default MainMenu;
