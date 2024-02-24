import React from 'react';
import './LoginPage.css';
import axiosInstance from '../../axios';
import { baseUrl } from '../../config/apiConfig';

const LoginPage = () => {
  const [loginUrl, setLoginUrl] = React.useState('');

  React.useEffect(() => {
    axiosInstance.get(`${baseUrl}/login`)
      .then(response => {
        setLoginUrl(response.data.login_url);
      })
      .catch(error => console.error('Error fetching login URL: ', error));
  }, []);

  return (
    <div className="login-page">
      <div className="login-container">
      <h2>Welcome to Game of Life</h2>
      <p>Start your journey now!</p>
      {loginUrl && (
        <a href={loginUrl} className="login-button">Login with Google</a>
      )}
      </div>
    </div>
  );
};

export default LoginPage;