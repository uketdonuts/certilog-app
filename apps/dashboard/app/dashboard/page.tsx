'use client';

import { useState, useEffect } from 'react';
import {
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { getDeliveryStats, getDeliveries, getCouriersLocations } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface Stats {
  total: number;
  pending: number;
  assigned: number;
  inTransit: number;
  delivered: number;
  failed: number;
  todayDelivered: number;
}

interface Delivery {
  id: string;
  trackingCode: string;
  status: string;
  customer: { name: string; address: string };
  courier?: { fullName: string };
  createdAt: string;
}

interface CourierLocation {
  courierId: string;
  fullName: string;
  activeDeliveries: number;
  location: {
    lat: number;
    lng: number;
    batteryLevel: number | null;
    recordedAt: string;
  } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<CourierLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, deliveriesData, couriersData] = await Promise.all([
          getDeliveryStats(),
          getDeliveries({ limit: 5 }),
          getCouriersLocations(),
        ]);

        setStats(statsData);
        // Handle paginated response: { data: [...], total, page, ... }
        const deliveriesList = Array.isArray(deliveriesData?.data) ? deliveriesData.data : Array.isArray(deliveriesData) ? deliveriesData : [];
        setRecentDeliveries(deliveriesList);
        const couriersList = Array.isArray(couriersData) ? couriersData : [];
        setCouriers(couriersList);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    const onLocation = (evt: any) => {
      setCouriers((prev) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const idx = list.findIndex((c) => c.courierId === evt.courierId);

        const next = {
          courierId: evt.courierId,
          fullName: evt.fullName ?? (idx >= 0 ? list[idx].fullName : 'Mensajero'),
          activeDeliveries: idx >= 0 ? list[idx].activeDeliveries : 0,
          location: {
            lat: evt.lat,
            lng: evt.lng,
            batteryLevel: evt.battery ?? null,
            recordedAt: new Date(evt.timestamp ?? Date.now()).toISOString(),
          },
        };

        if (idx >= 0) list[idx] = { ...list[idx], ...next };
        else list.unshift(next);

        return list;
      });
    };

    const onOffline = (evt: any) => {
      setCouriers((prev) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const idx = list.findIndex((c) => c.courierId === evt.courierId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], location: null };
        }
        return list;
      });
    };

    socket.on('courier:location', onLocation);
    socket.on('courier:offline', onOffline);

    return () => {
      socket.off('courier:location', onLocation);
      socket.off('courier:offline', onOffline);
      disconnectSocket();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Entregas Hoy',
      value: stats?.todayDelivered || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Pendientes',
      value: stats?.pending || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'En Tránsito',
      value: stats?.inTransit || 0,
      icon: TruckIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Fallidas',
      value: stats?.failed || 0,
      icon: ExclamationCircleIcon,
      color: 'bg-red-500',
    },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_TRANSIT: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    ASSIGNED: 'Asignada',
    IN_TRANSIT: 'En tránsito',
    DELIVERED: 'Entregada',
    FAILED: 'Fallida',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deliveries */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Entregas Recientes
            </h2>
          </div>
          <div className="divide-y">
            {recentDeliveries.map((delivery) => (
              <div key={delivery.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {delivery.trackingCode}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      statusColors[delivery.status]
                    }`}
                  >
                    {statusLabels[delivery.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{delivery.customer.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {delivery.customer.address}
                </p>
              </div>
            ))}
            {recentDeliveries.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No hay entregas recientes
              </div>
            )}
          </div>
        </div>

        {/* Active Couriers */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Mensajeros Activos
            </h2>
          </div>
          <div className="divide-y">
            {couriers.map((courier) => (
              <div key={courier.courierId} className="p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {courier.fullName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{courier.fullName}</p>
                    <p className="text-sm text-gray-500">
                      {courier.activeDeliveries} entrega(s) activa(s)
                    </p>
                  </div>
                  <div className="text-right">
                    {courier.location ? (
                      <>
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span className="text-sm text-gray-500">Online</span>
                        {courier.location.batteryLevel && (
                          <p className="text-xs text-gray-400">
                            Batería: {courier.location.batteryLevel}%
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                        <span className="text-sm text-gray-500">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {couriers.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No hay mensajeros activos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
