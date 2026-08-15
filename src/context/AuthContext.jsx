/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import {
  authApi,
  clearAuthData,
  expireAuthSession,
  getAuthData,
  persistAuthSession,
  refreshSession,
} from '../lib/api';
import { getDashboardRoute, isCustomerRole, isSellerRole } from '../lib/dashboard';

const AuthContext = createContext();

const isLoginOtpRequired = (result) =>
  result?.code === 'LOGIN_OTP_REQUIRED' ||
  result?.otpRequired === true ||
  Boolean(result?.expiresInMinutes && !result?.accessToken && !result?.token && !result?.user);

export function AuthProvider({ children }) {
  const [initialAuthData] = useState(() => getAuthData());
  const initialUser = initialAuthData?.user?.emailVerified === false ? null : initialAuthData?.user || null;
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(() => Boolean(initialAuthData?.refreshToken));

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const stored = getAuthData();

      if (stored?.user?.emailVerified === false) {
        clearAuthData();
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (!stored?.refreshToken) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const session = await refreshSession();
        if (!cancelled) {
          setUser(session.user || stored.user || null);
        }
      } catch {
        expireAuthSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpiredAuth = () => setUser(null);
    const handleTermsRequired = () => {
      setUser((current) => (current ? { ...current, termsAccepted: false } : current));
    };
    window.addEventListener('auth:expired', handleExpiredAuth);
    window.addEventListener('auth:terms-required', handleTermsRequired);
    return () => {
      window.removeEventListener('auth:expired', handleExpiredAuth);
      window.removeEventListener('auth:terms-required', handleTermsRequired);
    };
  }, []);

  const login = async (email, password, rememberMe = false) => {
    try {
      const result = await authApi.login(email, password, rememberMe);
      if (isLoginOtpRequired(result)) {
        return {
          success: true,
          requiresOtp: true,
          expiresInMinutes: result.expiresInMinutes || 10,
          message: result.message,
          ...result,
        };
      }

      if (result.user && (result.accessToken || result.token)) {
        persistAuthSession(result, { rememberMe });
        setUser(result.user);
        return { success: true };
      }

      return {
        success: true,
        requiresOtp: true,
        expiresInMinutes: result.expiresInMinutes || 10,
        message: result.message,
        ...result,
      };
    } catch (error) {
      if (isLoginOtpRequired(error.payload) || error.code === 'LOGIN_OTP_REQUIRED') {
        return {
          success: true,
          requiresOtp: true,
          expiresInMinutes: error.payload?.expiresInMinutes || 10,
          message: error.message,
          payload: error.payload,
        };
      }

      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.status,
        payload: error.payload,
      };
    }
  };

  const verifyLoginOtp = async (email, otp, rememberMe = false) => {
    try {
      const result = await authApi.verifyLoginOtp(email, otp);
      const session = persistAuthSession(result, { rememberMe });
      setUser(session.user);
      return { success: true, ...result, user: session.user };
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

  const resendLoginOtp = async (email) => {
    try {
      const result = await authApi.resendLoginOtp(email);
      return {
        success: true,
        expiresInMinutes: result.expiresInMinutes || 10,
        ...result,
      };
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
        persistAuthSession(result);
        setUser(result.user);
      } else {
        clearAuthData();
        setUser(null);
      }
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message, code: error.code, status: error.status };
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    try {
      const result = await authApi.verifyEmailOtp(email, otp);
      const session = persistAuthSession(result);
      setUser(session.user);
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
      return { success: false, error: error.message, code: error.code, status: error.status };
    }
  };

  const acceptTerms = async () => {
    try {
      const result = await authApi.acceptTerms();
      const current = getAuthData() || {};
      const session = persistAuthSession({
        ...current,
        user: result.user || current.user,
        accessToken: current.accessToken || current.token,
        token: current.token || current.accessToken,
        refreshToken: current.refreshToken,
        rememberMe: current.rememberMe,
      }, { rememberMe: current.rememberMe });
      setUser(session.user);
      return { success: true, user: session.user, ...result };
    } catch (error) {
      return { success: false, error: error.message, code: error.code, status: error.status };
    }
  };

  const logout = async () => {
    const refreshToken = getAuthData()?.refreshToken;
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Always clear the local session even if the API call fails.
    } finally {
      clearAuthData();
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    verifyLoginOtp,
    resendLoginOtp,
    register,
    verifyEmailOtp,
    resendEmailVerificationOtp,
    acceptTerms,
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
