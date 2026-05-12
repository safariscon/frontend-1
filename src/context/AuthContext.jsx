/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import {
  authApi,
  clearAuthData,
  getAuthData,
  saveAuthData,
} from '../lib/api';
import { getDashboardRoute, isCustomerRole, isSellerRole } from '../lib/dashboard';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const initialAuthData = getAuthData();
  const [user, setUser] = useState(initialAuthData?.user || null);
  const [loading] = useState(false);

  const login = async (email, password) => {
    try {
      const result = await authApi.login(email, password);
      const authData = { user: result.user, token: result.token };
      setUser(result.user);
      saveAuthData(authData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      await authApi.register(userData);
      // Registration succeeds, but user must login explicitly afterwards.
      clearAuthData();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
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
    logout,
    isAuthenticated: !!user,
    isTourist: user?.role === 'tourist',
    isCustomer: isCustomerRole(user?.role),
    isHotelOwner: user?.role === 'hotel',
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
