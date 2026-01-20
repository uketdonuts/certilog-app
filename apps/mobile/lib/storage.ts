import { Platform } from 'react-native';

// Storage abstraction that uses localStorage on web and SecureStore on native
const isWeb = Platform.OS === 'web';

let SecureStore: typeof import('expo-secure-store') | null = null;

// Dynamically import SecureStore only on native platforms
if (!isWeb) {
  SecureStore = require('expo-secure-store');
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(key);
  }
  return SecureStore!.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  return SecureStore!.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  return SecureStore!.deleteItemAsync(key);
}
