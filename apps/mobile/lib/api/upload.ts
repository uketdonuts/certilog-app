import api from './client';

export interface UploadResponse {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadPhoto(uri: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `photo_${Date.now()}.jpg`,
  } as unknown as Blob);

  const response = await api.post('/api/upload/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 60 seconds for upload
  });

  return response.data.data;
}

export async function uploadSignature(uri: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/png',
    name: `signature_${Date.now()}.png`,
  } as unknown as Blob);

  const response = await api.post('/api/upload/signature', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });

  return response.data.data;
}
