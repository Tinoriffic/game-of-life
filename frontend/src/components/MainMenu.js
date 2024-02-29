import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../axios';
import './MainMenu.css'
import PlayerCard from './player/PlayerCard';
import { useNavigate } from 'react-router-dom';
import { baseUrl } from '../config/apiConfig';
import { useUser } from './player/UserContext';

function MainMenu() {
  const token = localStorage.getItem('accessToken');
  const [error, setError] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const navigate = useNavigate();
  const { setUser } = useUser();

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
        localStorage.setItem('userId', response.data.id.toString());
        setUser({id: response.data.id});
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

export default MainMenu;
