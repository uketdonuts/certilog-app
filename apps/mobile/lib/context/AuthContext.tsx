import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  loginWithCredentials,
  loginWithPin,
  logout as apiLogout,
  getStoredUser,
  isAuthenticated as checkAuth,
} from '../api/auth';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication on mount
    async function checkStoredAuth() {
      try {
        const authenticated = await checkAuth();
        if (authenticated) {
          const storedUser = await getStoredUser();
          if (storedUser) {
            setUser(storedUser);
            // Connect socket for real-time updates
            await connectSocket();
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkStoredAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginWithCredentials(username, password);
    setUser(response.user);
    // Connect socket in background, don't block login
    connectSocket().catch((err) => console.warn('Socket connection failed:', err));
  }, []);

  const loginPin = useCallback(async (pin: string) => {
    const response = await loginWithPin(pin);
    setUser(response.user);
    // Connect socket in background, don't block login
    connectSocket().catch((err) => console.warn('Socket connection failed:', err));
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginPin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
