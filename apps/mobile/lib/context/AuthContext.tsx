import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  User,
  loginWithCredentials,
  loginWithPin,
  logout as apiLogout,
  getStoredUser,
  isAuthenticated as checkAuth,
} from '../api/auth';
import { connectSocket, disconnectSocket } from '../services/socket';
import { connectMqtt, disconnectMqtt } from '../services/mqtt';
import { startCourierTracking, stopCourierTracking } from '../services/tracking';
import { getMyDeliveries } from '../api/deliveries';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTracking: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const trackingActiveRef = useRef(false);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Check and manage tracking based on IN_TRANSIT deliveries
  const checkAndManageTracking = useCallback(async (currentUser: User | null) => {
    if (!currentUser || currentUser.role !== 'COURIER') {
      if (trackingActiveRef.current) {
        stopCourierTracking();
        trackingActiveRef.current = false;
        console.log('[Tracking] Stopped - user not a courier');
      }
      return;
    }

    try {
      const response = await getMyDeliveries(1, 100, 'IN_TRANSIT');
      const hasInTransitDeliveries = response.data && response.data.length > 0;

      if (hasInTransitDeliveries && !trackingActiveRef.current) {
        await startCourierTracking({ distanceInterval: 5, timeInterval: 5000 });
        trackingActiveRef.current = true;
        console.log('[Tracking] Started - has IN_TRANSIT deliveries');
      } else if (!hasInTransitDeliveries && trackingActiveRef.current) {
        stopCourierTracking();
        trackingActiveRef.current = false;
        console.log('[Tracking] Stopped - no IN_TRANSIT deliveries');
      }
    } catch (error) {
      console.warn('[Tracking] Error checking deliveries:', error);
    }
  }, []);

  // Set up tracking interval and app state listener
  useEffect(() => {
    if (user?.role === 'COURIER') {
      // Check immediately
      checkAndManageTracking(user);

      // Check every 30 seconds
      trackingIntervalRef.current = setInterval(() => {
        checkAndManageTracking(user);
      }, 30000);

      // Handle app state changes
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
          checkAndManageTracking(user);
        }
        appState.current = nextAppState;
      });

      return () => {
        if (trackingIntervalRef.current) {
          clearInterval(trackingIntervalRef.current);
        }
        subscription.remove();
      };
    }
  }, [user, checkAndManageTracking]);

  useEffect(() => {
    // Check for stored authentication on mount
    async function checkStoredAuth() {
      try {
        const authenticated = await checkAuth();
        if (authenticated) {
          const storedUser = await getStoredUser();
          if (storedUser) {
            setUser(storedUser);
            // Connect socket in background, don't block auth check
            connectSocket().catch((err) => console.warn('Socket connection failed:', err));

            if (storedUser.role === 'COURIER') {
              connectMqtt(storedUser).catch((err) => console.warn('MQTT connection failed:', err));
              // Tracking will be started by the effect above based on IN_TRANSIT deliveries
            }
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

    if (response.user.role === 'COURIER') {
      connectMqtt(response.user).catch((err) => console.warn('MQTT connection failed:', err));
      // Tracking will be started by the effect based on IN_TRANSIT deliveries
    }
  }, []);

  const loginPin = useCallback(async (pin: string) => {
    const response = await loginWithPin(pin);
    setUser(response.user);
    // Connect socket in background, don't block login
    connectSocket().catch((err) => console.warn('Socket connection failed:', err));

    if (response.user.role === 'COURIER') {
      connectMqtt(response.user).catch((err) => console.warn('MQTT connection failed:', err));
      // Tracking will be started by the effect based on IN_TRANSIT deliveries
    }
  }, []);

  // Manual refresh tracking - call after starting/completing a delivery
  const refreshTracking = useCallback(() => {
    if (user) {
      checkAndManageTracking(user);
    }
  }, [user, checkAndManageTracking]);

  const logout = useCallback(async () => {
    await apiLogout();
    stopCourierTracking();
    disconnectMqtt();
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
        refreshTracking,
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
