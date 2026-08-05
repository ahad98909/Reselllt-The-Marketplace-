import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, usersAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data);
        } catch (err) {
          console.error("Token validation failed, logging out:", err);
          logout();
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      const accessToken = res.data.access_token;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      
      const userRes = await authAPI.getMe();
      setUser(userRes.data);
      setLoading(false);
      return userRes.data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (name, email, password, address, latitude, longitude, gender) => {
    setLoading(true);
    try {
      const res = await authAPI.register(name, email, password, address, latitude, longitude, gender);
      const accessToken = res.data.access_token;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);

      const userRes = await authAPI.getMe();
      setUser(userRes.data);
      setLoading(false);
      return userRes.data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    try {
      const res = await usersAPI.updateProfile(data);
      setUser(res.data);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const verifyEmail = async () => {
    try {
      const res = await authAPI.verifyEmail();
      setUser((prev) => (prev ? { ...prev, email_verified: true } : null));
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        verifyEmail,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
