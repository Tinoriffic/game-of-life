import React, { useState } from 'react';
import axios from 'axios';
import './SetUserInfoPage.css';
import houseIcon from './house-icon.jpg'
import { useNavigate, useLocation } from 'react-router-dom';

const SetUserInfoPage = () => {
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const usernameSetToken = location.state?.usernameSetToken;
  console.log("occupation: " + occupation + " city: " + city + "temp_token:" + usernameSetToken);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await axios.post('http://localhost:8000/finalize-oauth-registration', {
          occupation,
          city,
          temp_token: usernameSetToken
        });
  
        navigate('/');
      } catch (error) {
        console.error('Error creating account: ', error);
        // TODO: Handle errors, display them to the user
      }
  };

  return (
    <div className="set-user-info-container">
      <div className="info-form-container">
        <form onSubmit={handleSubmit}>
          <h2>Complete Your Profile</h2>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Occupation"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
          />
          <button type="submit">Submit</button>
        </form>
      </div>
      <div className="image-container">
        <img src={houseIcon} alt="Home" />
      </div>
    </div>
  );
};

export default SetUserInfoPage;
