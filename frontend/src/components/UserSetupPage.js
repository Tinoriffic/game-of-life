import React, { useState } from 'react';
import axiosInstance from '../axios';
import debounce from 'lodash/debounce';
import { useNavigate, useLocation } from 'react-router-dom';
import { baseUrl } from '../config/apiConfig';
import houseIcon from './house-icon-3.png'
import './UserSetupPage.css'

const UserSetupPage = () => {
  const [username, setUsername] = useState('');
  const [occupation, setOccupation] = useState('');
  const [city, setCity] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const oAuthValidationToken = queryParams.get('token');

  const [usernameValid, setUsernameValid] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(false);
  //let registrationToken;

  const handleUsernameChange = (e) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    if (newUsername.length >= 4) {
        setUsernameValid(false);
        setCheckingUsername(true);
        debounceCheckUsername(e.target.value);
    } else {
        setUsernameValid(false);
        setCheckingUsername(false);
        setError("Username must be at least 4 characters long.");
    }
  };

  const debounceCheckUsername = debounce(async (username) => {
    try {
      const response = await axiosInstance.post(`${baseUrl}/set-username`, { 
        username: username,
        token: oAuthValidationToken
    });

    setRegistrationToken(response.data.registration_token);
      if (response.data) {
        setUsernameValid(true);
        setError('');
      }

    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.detail === "Username already taken") {
            setError("Username is taken, please try a different one.");
        }
        if (error.response && error.response.status === 400 && error.response.data.detail === "Invalid token") {
            setError("Token is invalid or expired, try refreshing.")
        }
      console.error('Error setting username: ', error);
    } finally {
      setCheckingUsername(false);
    }
  }, 300);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.substr(0, 5) === 'image') {
      setAvatar(file);

      // Create a preview of the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError('File is not an image.');
      setAvatar(null);
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log("Registration Token at submission:", registrationToken);
    try {
        const response = await axiosInstance.post(`${baseUrl}/finalize-oauth-registration`, {
          occupation,
          city,
          temp_token: registrationToken
        });

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
    <div className="user-setup-container">
      <div className="image-container">
        <img src={houseIcon} alt="Home" />
      </div>
      <div className="info-form-container">
        <h2>Complete Your Profile</h2>
        <form onSubmit={handleSubmit}>
        <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            onBlur={handleUsernameChange} // Also check when the user leaves the field
            placeholder="Username"
            required
            />
            {checkingUsername && <div>Checking username...</div>}
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
            <div className="avatar-upload-container">
                <label htmlFor="avatar-upload" className="form-label">Upload Your Avatar (Optional)</label>
                <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="file-input"
                />
            {avatarPreview && (
                <img src={avatarPreview} alt="Avatar Preview" className="avatar-preview" />
            )}
        </div>
        <button type="submit" disabled={!usernameValid || checkingUsername }>Submit</button>
      </form>
      {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default UserSetupPage;
