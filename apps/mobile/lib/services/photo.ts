import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressedPhoto {
  uri: string;
  width: number;
  height: number;
  size: number;
}

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 1280;
const QUALITY = 0.7;
const MAX_SIZE_BYTES = 300000; // 300KB
const FALLBACK_QUALITY = 0.5;
const FALLBACK_WIDTH = 1024;

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function capturePhoto(): Promise<CompressedPhoto | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Se requiere permiso para usar la cámara');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return compressImage(result.assets[0].uri);
}

export async function pickImage(): Promise<CompressedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return compressImage(result.assets[0].uri);
}

async function compressImage(uri: string): Promise<CompressedPhoto> {
  // First compression pass
  let compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }],
    {
      compress: QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  // Check file size
  const fileInfo = await FileSystem.getInfoAsync(compressed.uri);
  const size = (fileInfo as { size?: number }).size || 0;

  // If still too large, compress more aggressively
  if (size > MAX_SIZE_BYTES) {
    compressed = await ImageManipulator.manipulateAsync(
      compressed.uri,
      [{ resize: { width: FALLBACK_WIDTH } }],
      {
        compress: FALLBACK_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
  }

  const finalInfo = await FileSystem.getInfoAsync(compressed.uri);

  return {
    uri: compressed.uri,
    width: compressed.width,
    height: compressed.height,
    size: (finalInfo as { size?: number }).size || 0,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
