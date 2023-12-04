import React from 'react';
import './MainMenu.css'
import PlayerCard from './PlayerCard';

function MainMenu() {
  return (
    <div className="main-screen">
      <section className="player-card">
      <PlayerCard playerData={yourPlayerData} />
      </section>
      <section className="skill-tree">
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
    awareness: {
      level: 2,
      currXP: 30,
      maxXP: 100
    },
    charisma: {
      level: 1,
      currXP: 50,
      maxXP: 100
    },
    endurance: {
      level: 1,
      currXP: 92,
      maxXP: 100
    },
    intelligence: {
      level: 1,
      currXP: 22,
      maxXP: 100
    },
    strength: {
      level: 1,
      currXP: 70,
      maxXP: 100
    },
    wisdom: {
      level: 2,
      currXP: 12,
      maxXP: 100
    }
  }
};


export default MainMenu;
