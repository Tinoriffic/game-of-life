import React from 'react';
import './LoginPage.css';
import axios from 'axios';

const LoginPage = () => {
  const [loginUrl, setLoginUrl] = React.useState('');

  React.useEffect(() => {
    axios.get('http://localhost:8000/login')
      .then(response => {
        setLoginUrl(response.data.login_url);
      })
      .catch(error => console.error('Error fetching login URL: ', error));
  }, []);

  return (
    <div className="login-page">
      <h2>Welcome to Game of Life</h2>
      <p>Start your journey by logging in</p>
      {loginUrl && (
        <a href={loginUrl} className="login-button">Login with Google</a>
      )}
    </div>
  );
};

export default LoginPage;