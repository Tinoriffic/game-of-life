import React from 'react';
import { useLocation } from 'react-router-dom';

const TokenReceiver = () => {
  const location = useLocation();

  React.useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const accessToken = queryParams.get('accessToken');
    const refreshToken = queryParams.get('refreshToken');

    if (accessToken && refreshToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      window.location.href = '/';
    }
  }, [location]);

  return (
    <div>Loading...</div>
  );
};

export default TokenReceiver;