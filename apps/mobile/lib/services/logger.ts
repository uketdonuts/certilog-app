import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  [key: string]: unknown;
}

// Use the same URL logic as the API client
const API_URL = Platform.OS === 'web'
  ? 'https://jtfrcpdb-2120.use2.devtunnels.ms'
  : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:2120');

async function getDeviceInfo() {
  return {
    platform: Platform.OS,
    osVersion: Platform.Version,
    deviceName: Device.deviceName,
    deviceType: Device.deviceType,
    brand: Device.brand,
    modelName: Device.modelName,
    isDevice: Device.isDevice,
  };
}

async function sendLog(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  context?: LogContext
) {
  try {
    const deviceInfo = await getDeviceInfo();

    let stack: string | undefined;
    let errorContext: LogContext = {};

    if (error) {
      if (error instanceof Error) {
        stack = error.stack;
        errorContext = {
          errorName: error.name,
          errorMessage: error.message,
        };
      } else if (typeof error === 'object' && error !== null) {
        // Handle Axios errors
        const axiosError = error as {
          response?: { status?: number; data?: unknown };
          config?: { url?: string; method?: string };
          message?: string;
        };

        if (axiosError.response) {
          errorContext = {
            status: axiosError.response.status,
            responseData: axiosError.response.data,
            url: axiosError.config?.url,
            method: axiosError.config?.method,
          };
        }

        if (axiosError.message) {
          errorContext.message = axiosError.message;
        }
      }
    }

    const payload = {
      level,
      message,
      stack,
      context: { ...errorContext, ...context },
      deviceInfo,
      platform: Platform.OS,
      appVersion: Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0',
    };

    // Log locally too
    console.log(`[${level}] ${message}`, payload.context);

    // Send to server (fire and forget, don't block)
    fetch(`${API_URL}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch((e) => {
      // Silently fail - we don't want logging errors to cause more errors
      console.warn('Failed to send log to server:', e);
    });
  } catch (e) {
    console.warn('Logger error:', e);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => sendLog('DEBUG', message, undefined, context),
  info: (message: string, context?: LogContext) => sendLog('INFO', message, undefined, context),
  warn: (message: string, error?: Error | unknown, context?: LogContext) => sendLog('WARN', message, error, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => sendLog('ERROR', message, error, context),
};

export default logger;
