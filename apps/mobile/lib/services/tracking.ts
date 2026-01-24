import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const BACKGROUND_LOCATION_TASK = 'certilog-background-location';
const LOCATION_STORAGE_KEY = '@certilog:pending_locations';

// Define the background task - this runs even when app is closed
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (locations && locations.length > 0) {
      const location = locations[0];
      const locationData = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        speed: location.coords.speed ?? undefined,
        timestamp: location.timestamp,
      };

      console.log('[BackgroundLocation] Received:', locationData);

      // Try to send location to server
      try {
        await sendLocationToServer(locationData);
      } catch (err) {
        // If fails, store locally for later sync
        await storeLocationLocally(locationData);
        console.log('[BackgroundLocation] Stored locally for later sync');
      }
    }
  }
});

// Send location to server via API
async function sendLocationToServer(location: {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  timestamp?: number;
}): Promise<void> {
  await api.post('/api/locations/batch', {
    locations: [{
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      speed: location.speed,
      recordedAt: location.timestamp ? new Date(location.timestamp).toISOString() : new Date().toISOString(),
    }],
  });
}

// Store location locally when offline
async function storeLocationLocally(location: {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  timestamp?: number;
}): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    const locations = stored ? JSON.parse(stored) : [];
    locations.push({
      ...location,
      storedAt: Date.now(),
    });
    // Keep only last 1000 locations to avoid storage issues
    const trimmed = locations.slice(-1000);
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('[BackgroundLocation] Error storing locally:', err);
  }
}

// Sync stored locations when back online
export async function syncStoredLocations(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (!stored) return 0;

    const locations = JSON.parse(stored);
    if (locations.length === 0) return 0;

    // Send in batches of 50
    const batchSize = 50;
    let syncedCount = 0;

    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      try {
        await api.post('/api/locations/batch', {
          locations: batch.map((loc: { lat: number; lng: number; accuracy?: number; speed?: number; timestamp?: number }) => ({
            lat: loc.lat,
            lng: loc.lng,
            accuracy: loc.accuracy,
            speed: loc.speed,
            recordedAt: loc.timestamp ? new Date(loc.timestamp).toISOString() : new Date().toISOString(),
          })),
        });
        syncedCount += batch.length;
      } catch {
        // Stop on error, keep remaining for next sync
        break;
      }
    }

    // Remove synced locations
    if (syncedCount > 0) {
      const remaining = locations.slice(syncedCount);
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(remaining));
    }

    console.log(`[BackgroundLocation] Synced ${syncedCount} stored locations`);
    return syncedCount;
  } catch (err) {
    console.error('[BackgroundLocation] Error syncing stored locations:', err);
    return 0;
  }
}

// Start background location tracking
export async function startCourierTracking(options?: {
  distanceInterval?: number;
  timeInterval?: number;
}): Promise<void> {
  // Request permissions
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Se requiere permiso de ubicación en primer plano');
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.warn('[BackgroundLocation] Background permission not granted, using foreground only');
  }

  // Check if already tracking
  const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
  if (isTracking) {
    console.log('[BackgroundLocation] Already tracking');
    return;
  }

  // Start background location updates
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: options?.distanceInterval ?? 10, // meters
    timeInterval: options?.timeInterval ?? 10000, // 10 seconds
    foregroundService: {
      notificationTitle: 'CertiLog',
      notificationBody: 'Compartiendo ubicación durante la entrega',
      notificationColor: '#3B82F6',
    },
    // Android specific
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    // iOS specific
    activityType: Location.ActivityType.AutomotiveNavigation,
  });

  console.log('[BackgroundLocation] Started background tracking');

  // Try to sync any stored locations
  syncStoredLocations().catch(() => undefined);
}

// Stop background location tracking
export async function stopCourierTracking(): Promise<void> {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('[BackgroundLocation] Stopped background tracking');
    }
  } catch (err) {
    console.error('[BackgroundLocation] Error stopping tracking:', err);
  }
}

// Check if background tracking is active
export async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}
