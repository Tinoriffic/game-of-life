import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import './ChooseUsernamePage.css'

const ChooseUsernamePage = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const oAuthValidationToken = queryParams.get('token'); // Extract token from URL

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log("temp_token 1: " + oAuthValidationToken)
    try {
      const response = await axios.post('http://localhost:8000/set-username', {
        username: username,
        token: oAuthValidationToken
      });

      const usernameSetToken = response.data.temp_token;
      console.log("temp_token 2: " + usernameSetToken);

    // if (response.data.temp_token) {
    //     localStorage.setItem('sessionToken', response.data.temp_token)
    // }

      navigate('/set-user-info', { state: { usernameSetToken: usernameSetToken}}); // Redirect to next part of registration

    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.detail === "Username must be at least 4 characters long") {
            //alert("Username must be at least 4 characters in length.")
            setError("Username must be at least 4 characters in length.");
        }
        if (error.response && error.response.status === 400 && error.response.data.detail === "Username already taken") {
            alert("Username already taken, please try a different one.");
        }
        else if (error.response && error.response.status === 400 && error.response.data.detail === "Invalid token") {
            alert("Token is invalid or expired, try refreshing.")
        }
      console.error('Error setting username: ', error);
    }
  };

  return (
    <div>
      <h2>Choose Your Username</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <button type="submit">Submit</button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default ChooseUsernamePage;
