import React, { useState, useEffect } from 'react';
import axiosInstance from '../axios';
import './MainMenu.css'
import PlayerCard from './player/PlayerCard';
import { useNavigate } from 'react-router-dom';
import { baseUrl } from '../config/apiConfig';

function MainMenu() {
  const token = localStorage.getItem('accessToken');
  const [error, setError] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const navigate = useNavigate();

  console.log('MainMenu: Using access token:', token);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get(`${baseUrl}/users/me`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        setPlayerData(response.data);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          setError(error.response.data.detail);
        }
        console.error('Error fetching user data', error);
      }
    };

    fetchUserData();
  }, []);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  console.log('Player Data:', playerData) // Debugging

  if (!playerData) {
    return <div>
      Unable to fetch user's data...
      {error && <p className="error-message">Error Message: {error}</p>}
      {error && <button onClick={handleLoginRedirect} className="login-redirect-button">Go to Login</button>}
      </div>;
  }

  console.log(playerData);

  return (
    <div className="main-screen">
        <PlayerCard playerData={playerData} />
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
