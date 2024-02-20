import React, { useState } from 'react';
import axiosInstance from '../axios';
import './SetUserInfoPage.css';
import houseIcon from './house-icon-3.png'
import { useNavigate, useLocation } from 'react-router-dom';
import { baseUrl } from '../config/apiConfig';

const SetUserInfoPage = () => {
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const registrationToken = location.state?.registrationToken;
  console.log("occupation: " + occupation + " city: " + city + "temp_token:" + registrationToken);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
        const response = await axiosInstance.post(`${baseUrl}/finalize-oauth-registration`, {
          occupation,
          city,
          temp_token: registrationToken
        });

        // Store access and refresh tokens
        localStorage.setItem('accessToken', response.data.access_token);
        localStorage.setItem('refreshToken', response.data.refresh_token);
  
        navigate('/');
      } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.detail === "Occupation must be at least 4 characters long") {
            setError("Occupation must be at least 4 characters long");
        }
        if (error.response && error.response.status === 400 && error.response.data.detail === "City must be at least 4 characters long") {
           setError("City must be at least 4 characters long");
        }
        if (error.response && error.response.status === 400 && error.response.data.detail === "Invalid token") {
          setError("Token is invalid or expired, try refreshing.")
        }
        console.error('Error creating account: ', error);
      }
  };

  return (
    <div className="set-user-info-container">
      <div className="image-container">
        <img src={houseIcon} alt="Home" />
      </div>
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
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default SetUserInfoPage;
