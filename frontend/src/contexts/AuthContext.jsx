import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check URL params for Steam auth
      const params = new URLSearchParams(window.location.search);
      const userId = params.get('userId');
      const steamId = params.get('steamId');

      if (userId && steamId) {
        try {
          // Fetch full user details
          const response = await axios.get(`/api/auth/user/${userId}`);
          const userData = response.data;
          
          // Save auth data to localStorage
          localStorage.setItem('auth', JSON.stringify({
            userId,
            steamId,
            username: userData.username
          }));
          
          setUser({
            id: userId,
            steamId,
            username: userData.username,
            isAnonymous: false
          });
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Failed to fetch user details:', error);
          createAnonymousUser();
        }
      } else {
        // Check localStorage for existing auth
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          try {
            const authData = JSON.parse(savedAuth);
            const response = await axios.get(`/api/auth/user/${authData.userId}`);
            const userData = response.data;
            
            setUser({
              id: authData.userId,
              steamId: authData.steamId,
              username: userData.username,
              isAnonymous: false
            });
          } catch (error) {
            console.error('Failed to restore auth:', error);
            localStorage.removeItem('auth');
            createAnonymousUser();
          }
        } else {
          createAnonymousUser();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const createAnonymousUser = async () => {
    try {
      const response = await axios.post('/api/auth/anonymous');
      setUser({ 
        id: response.data.userId, 
        username: response.data.username, 
        isAnonymous: true 
      });
      // Clear any existing auth
      localStorage.removeItem('auth');
    } catch (error) {
      console.error('Failed to create anonymous user:', error);
    }
  };

  const logout = () => {
    // Clear auth data from localStorage
    localStorage.removeItem('auth');
    // Set user to null
    setUser(null);
    // Redirect to home page
    window.location.href = '/';
  };

  const loginWithSteam = () => {
    window.location.href = '/api/auth/steam';
  };

  const value = {
    user,
    loading,
    loginWithSteam,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
