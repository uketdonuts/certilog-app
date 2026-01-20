import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }

  // Request background permission for tracking
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return backgroundStatus === 'granted';
}

export async function getCurrentLocation(): Promise<LocationCoords> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Se requiere permiso de ubicación');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
  };
}

export async function watchPosition(
  callback: (location: LocationCoords) => void,
  options?: {
    distanceInterval?: number;
    timeInterval?: number;
  }
): Promise<Location.LocationSubscription> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Se requiere permiso de ubicación');
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: options?.distanceInterval || 10, // 10 meters
      timeInterval: options?.timeInterval || 30000, // 30 seconds
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
      });
    }
  );
}

export function openMapsNavigation(latitude: number, longitude: number, label?: string): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}${label ? `&destination_place_id=${encodeURIComponent(label)}` : ''}`;
  // Use Linking from expo-linking
  import('expo-linking').then(({ openURL }) => openURL(url));
}
