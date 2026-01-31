'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const TrackingMap = dynamic(() => import('./TrackingMapClient'), { ssr: false });

interface TrackingData {
  trackingCode: string;
  status: string;
  priority: string;
  createdAt: string;
  deliveredAt: string | null;
  zone: string;
  destinationLat: number | null;
  destinationLng: number | null;
  courierName: string | null;
}

interface CourierLocation {
  available: boolean;
  lat?: number;
  lng?: number;
  updatedAt?: string;
  message?: string;
}

interface RoutePoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; Icon: typeof TruckIcon }> = {
  PENDING: {
    label: 'Pendiente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    Icon: ClockIcon,
  },
  ASSIGNED: {
    label: 'Asignada',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    Icon: TruckIcon,
  },
  IN_TRANSIT: {
    label: 'En camino',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    Icon: TruckIcon,
  },
  DELIVERED: {
    label: 'Entregada',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    Icon: CheckCircleIcon,
  },
  FAILED: {
    label: 'Fallida',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    Icon: ExclamationTriangleIcon,
  },
};

export default function PublicTrackingPage() {
  const params = useParams();
  const token = params?.token as string;

  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [courierLocation, setCourierLocation] = useState<CourierLocation | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2120';

  const fetchTrackingData = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/track/${token}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Entrega no encontrada');
        return;
      }

      setTracking(data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tracking:', err);
      setError('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  const fetchCourierLocation = useCallback(async () => {
    if (!token || !tracking || tracking.status !== 'IN_TRANSIT') return;

    try {
      const response = await fetch(`${apiUrl}/api/track/${token}/location`);
      const data = await response.json();

      if (data.success) {
        setCourierLocation(data.data);
      }
    } catch (err) {
      console.error('Error fetching courier location:', err);
    }
  }, [token, tracking, apiUrl]);

  const fetchRoutePoints = useCallback(async () => {
    if (!token || !tracking || (tracking.status !== 'IN_TRANSIT' && tracking.status !== 'DELIVERED')) return;

    try {
      const response = await fetch(`${apiUrl}/api/track/${token}/route`);
      const data = await response.json();

      if (data.success) {
        setRoutePoints(data.data.points || []);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
    }
  }, [token, tracking, apiUrl]);

  // Initial fetch
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Fetch courier location and route when tracking data is available
  useEffect(() => {
    if (tracking) {
      fetchCourierLocation();
      fetchRoutePoints();
    }
  }, [tracking, fetchCourierLocation, fetchRoutePoints]);

  // Poll for updates every 30 seconds if in transit
  useEffect(() => {
    if (!tracking || tracking.status !== 'IN_TRANSIT') return;

    const interval = setInterval(() => {
      fetchCourierLocation();
      fetchRoutePoints();
    }, 30000);

    return () => clearInterval(interval);
  }, [tracking, fetchCourierLocation, fetchRoutePoints]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!tracking) return null;

  const statusInfo = statusConfig[tracking.status] || statusConfig.PENDING;
  const StatusIcon = statusInfo.Icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <TruckIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-white font-bold">CertiLog</h1>
              <p className="text-blue-100 text-sm">Seguimiento de Entrega</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Código de seguimiento</p>
              <p className="text-xl font-bold text-gray-900">{tracking.trackingCode}</p>
            </div>
            <div className={`p-3 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusInfo.bgColor}`}>
            <div className={`w-2 h-2 rounded-full ${statusInfo.color.replace('text-', 'bg-')}`}></div>
            <span className={`font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>

          {tracking.status === 'DELIVERED' && tracking.deliveredAt && (
            <p className="mt-4 text-sm text-gray-600">
              Entregada el {new Date(tracking.deliveredAt).toLocaleString('es-PA', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Información de la Entrega</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Zona de entrega</p>
                <p className="text-gray-900">{tracking.zone}</p>
              </div>
            </div>

            {tracking.courierName && (
              <div className="flex items-start gap-3">
                <TruckIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Mensajero</p>
                  <p className="text-gray-900">{tracking.courierName}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Creada</p>
                <p className="text-gray-900">
                  {new Date(tracking.createdAt).toLocaleString('es-PA', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        {(tracking.status === 'IN_TRANSIT' || tracking.status === 'DELIVERED') && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              {tracking.status === 'IN_TRANSIT' ? 'Ubicación en tiempo real' : 'Ruta realizada'}
            </h2>

            {courierLocation && !courierLocation.available && (
              <p className="text-sm text-gray-500 mb-4">{courierLocation.message}</p>
            )}

            <TrackingMap
              routePoints={routePoints}
              courierLocation={
                courierLocation?.available && courierLocation.lat && courierLocation.lng
                  ? { lat: courierLocation.lat, lng: courierLocation.lng }
                  : null
              }
              destination={
                tracking.destinationLat && tracking.destinationLng
                  ? { lat: tracking.destinationLat, lng: tracking.destinationLng }
                  : null
              }
            />

            {tracking.status === 'IN_TRANSIT' && courierLocation?.updatedAt && (
              <p className="mt-3 text-xs text-gray-400 text-center">
                Última actualización:{' '}
                {new Date(courierLocation.updatedAt).toLocaleTimeString('es-PA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Estado del Envío</h2>

          <div className="space-y-4">
            {['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].map((status, index) => {
              const config = statusConfig[status];
              const isPast = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].indexOf(tracking.status) >= index;
              const isCurrent = tracking.status === status;

              return (
                <div key={status} className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isPast ? config.bgColor : 'bg-gray-100'
                    }`}
                  >
                    <config.Icon
                      className={`h-4 w-4 ${isPast ? config.color : 'text-gray-400'}`}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isCurrent ? config.color : isPast ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {config.label}
                    </p>
                  </div>
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-blue-100 text-sm">
            Powered by <span className="font-semibold">CertiLog</span>
          </p>
        </div>
      </div>
    </div>
  );
}
