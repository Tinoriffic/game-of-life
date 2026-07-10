import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  // cached user. Refresh from /users/me once per app load: legacy pages need
  // an id, and server-side changes (feature_flags, role) must not be stuck
  // behind a stale localStorage copy. Cached user still renders instantly.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !localStorage.getItem('accessToken')) return;
    hydratedRef.current = true;
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
