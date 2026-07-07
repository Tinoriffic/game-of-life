import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../../axios';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userData');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const updateUser = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('userData', JSON.stringify(userData));
    } else {
      localStorage.removeItem('userData');
    }
  };

  // The OAuth flow only stores tokens, so a logged-in session can start with no
  // cached user. Hydrate from /users/me once so legacy `/users/{user.id}/…`
  // pages (workout logger, stats) have an id instead of crashing on null.
  useEffect(() => {
    if (user || !localStorage.getItem('accessToken')) return;
    axiosInstance.get('/users/me')
      .then((res) => updateUser(res.data))
      .catch(() => { /* 401 is handled by the axios interceptor */ });
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser: updateUser }}>
      {children}
    </UserContext.Provider>
  );
};
