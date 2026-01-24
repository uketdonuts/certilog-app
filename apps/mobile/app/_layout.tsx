import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';

// mqtt.js expects Buffer/process in some runtimes
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
(globalThis as any).process = (globalThis as any).process || require('process');

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/lib/context/AuthContext';

// Ensure background task is registered in the JS bundle even for headless/background execution.
import '@/lib/services/tracking';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#3B82F6' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(dispatcher-tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="delivery/[id]"
          options={{
            title: 'Detalle de Entrega',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="delivery/complete/[id]"
          options={{
            title: 'Completar Entrega',
            presentation: 'modal',
          }}
        />

        <Stack.Screen
          name="delivery/route/[id]"
          options={{
            title: 'Ruta de Entrega',
            presentation: 'card',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
