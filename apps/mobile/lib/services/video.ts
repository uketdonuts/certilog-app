import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export interface CapturedVideo {
  uri: string;
  duration: number;
  size: number;
}

const MAX_DURATION = 10; // 10 seconds

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function captureVideo(): Promise<CapturedVideo | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Se requiere permiso para usar la cámara');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: MAX_DURATION,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const fileInfo = await FileSystem.getInfoAsync(asset.uri);

  return {
    uri: asset.uri,
    duration: asset.duration || 0,
    size: (fileInfo as { size?: number }).size || 0,
  };
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
