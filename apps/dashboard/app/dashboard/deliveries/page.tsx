'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  getDeliveries,
  getCouriers,
  getCustomers,
  createDelivery,
  assignDelivery,
} from '@/lib/api';

interface Delivery {
  id: string;
  trackingCode: string;
  status: string;
  priority: string;
  description: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  courier?: {
    id: string;
    fullName: string;
    phone: string;
  };
  createdAt: string;
  deliveredAt: string | null;
}

interface Courier {
  id: string;
  fullName: string;
  phone: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Delivery | null>(null);

  // New delivery form
  const [newDelivery, setNewDelivery] = useState({
    customerId: '',
    description: '',
    priority: 'NORMAL',
    courierId: '',
  });

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  async function fetchData() {
    try {
      const [deliveriesData, couriersData, customersData] = await Promise.all([
        getDeliveries({ search, status: statusFilter || undefined, limit: 50 }),
        getCouriers(),
        getCustomers({ limit: 100 }),
      ]);

      setDeliveries(deliveriesData.data);
      setCouriers(couriersData);
      setCustomers(customersData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateDelivery(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createDelivery({
        customerId: newDelivery.customerId,
        description: newDelivery.description || undefined,
        priority: newDelivery.priority,
        courierId: newDelivery.courierId || undefined,
      });
      setShowNewModal(false);
      setNewDelivery({ customerId: '', description: '', priority: 'NORMAL', courierId: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating delivery:', error);
      alert('Error al crear la entrega');
    }
  }

  async function handleAssign(courierId: string) {
    if (!showAssignModal) return;
    try {
      await assignDelivery(showAssignModal.id, courierId);
      setShowAssignModal(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning delivery:', error);
      alert('Error al asignar la entrega');
    }
  }

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

  const priorityColors: Record<string, string> = {
    LOW: 'text-gray-500',
    NORMAL: 'text-blue-500',
    HIGH: 'text-orange-500',
    URGENT: 'text-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Entregas</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Entrega
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="ASSIGNED">Asignadas</option>
            <option value="IN_TRANSIT">En tránsito</option>
            <option value="DELIVERED">Entregadas</option>
            <option value="FAILED">Fallidas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensajero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {delivery.trackingCode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-900">{delivery.customer.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {delivery.customer.address}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {delivery.courier ? (
                      <span className="text-gray-900">
                        {delivery.courier.fullName}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        statusColors[delivery.status]
                      }`}
                    >
                      {statusLabels[delivery.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        priorityColors[delivery.priority]
                      }`}
                    >
                      {delivery.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(delivery.status === 'PENDING' ||
                      delivery.status === 'ASSIGNED') && (
                      <button
                        onClick={() => setShowAssignModal(delivery)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        {delivery.courier ? 'Reasignar' : 'Asignar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {deliveries.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron entregas
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* New Delivery Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowNewModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Nueva Entrega
              </h2>
              <form onSubmit={handleCreateDelivery} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={newDelivery.customerId}
                    onChange={(e) =>
                      setNewDelivery({ ...newDelivery, customerId: e.target.value })
                    }
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Seleccionar cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={newDelivery.description}
                    onChange={(e) =>
                      setNewDelivery({ ...newDelivery, description: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="Descripción del paquete"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newDelivery.priority}
                    onChange={(e) =>
                      setNewDelivery({ ...newDelivery, priority: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="LOW">Baja</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asignar a mensajero (opcional)
                  </label>
                  <select
                    value={newDelivery.courierId}
                    onChange={(e) =>
                      setNewDelivery({ ...newDelivery, courierId: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sin asignar</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Crear Entrega
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowAssignModal(null)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Asignar Entrega
              </h2>
              <p className="text-gray-600 mb-6">
                Selecciona un mensajero para la entrega{' '}
                <strong>{showAssignModal.trackingCode}</strong>
              </p>
              <div className="space-y-2">
                {couriers.map((courier) => (
                  <button
                    key={courier.id}
                    onClick={() => handleAssign(courier.id)}
                    className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-semibold">
                        {courier.fullName.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        {courier.fullName}
                      </p>
                      <p className="text-sm text-gray-500">{courier.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAssignModal(null)}
                className="w-full mt-4 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
