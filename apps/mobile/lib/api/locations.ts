import api from './client';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  battery?: number;
  recordedAt?: string;
}

export async function sendLocationBatch(locations: LocationData[]): Promise<{ added: number }> {
  const response = await api.post('/api/locations/batch', { locations });
  return response.data.data;
}
