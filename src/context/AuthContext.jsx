/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import {
  authApi,
  clearAuthData,
  getAuthData,
  saveAuthData,
} from '../lib/api';
import { getDashboardRoute, isCustomerRole, isSellerRole } from '../lib/dashboard';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [initialAuthData] = useState(() => getAuthData());
  const initialUser = initialAuthData?.user?.emailVerified === false ? null : initialAuthData?.user || null;
  const [user, setUser] = useState(initialUser);
  const [loading] = useState(false);

  useEffect(() => {
    if (initialAuthData?.user?.emailVerified === false) {
      clearAuthData();
    }
  }, [initialAuthData]);

  useEffect(() => {
    const handleExpiredAuth = () => setUser(null);
    window.addEventListener('auth:expired', handleExpiredAuth);
    return () => window.removeEventListener('auth:expired', handleExpiredAuth);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await authApi.login(email, password);
      const authData = { user: result.user, token: result.token };
      setUser(result.user);
      saveAuthData(authData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        payload: error.payload,
      };
    }
  };

  const register = async (userData) => {
    try {
      const result = await authApi.register(userData);
      if (result.user?.emailVerified) {
        const authData = { user: result.user, token: result.token };
        setUser(result.user);
        saveAuthData(authData);
      } else {
        clearAuthData();
        setUser(null);
      }
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const result = await authApi.verifyEmailOtp(email, otp);
      const authData = { user: result.user, token: result.token };
      setUser(result.user);
      saveAuthData(authData);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message, status: error.status };
    }
  };

  const resendEmailVerificationOtp = async (email) => {
    try {
      const result = await authApi.resendEmailVerificationOtp(email);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message, status: error.status };
    }
  };

  const logout = () => {
    setUser(null);
    clearAuthData();
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyEmailOtp,
    resendEmailVerificationOtp,
    logout,
    isAuthenticated: !!user,
    isTourist: user?.role === 'tourist',
    isCustomer: isCustomerRole(user?.role),
    isSeller: isSellerRole(user?.role),
    isAdmin: user?.role === 'admin',
    dashboardRoute: getDashboardRoute(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
