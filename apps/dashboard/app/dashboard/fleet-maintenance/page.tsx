'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { getFleetMaintenance, createFleetMaintenance, updateFleetMaintenance, deleteFleetMaintenance, getVehicles } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
}

interface FleetMaintenanceReport {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  reportedBy: string | null;
  reporter?: { id: string; fullName: string } | null;
  date: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
}

export default function FleetMaintenancePage() {
  const [items, setItems] = useState<FleetMaintenanceReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FleetMaintenanceReport | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    description: '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
  });

  const toast = useToast();

  useEffect(() => {
    fetchItems();
    fetchVehicles();
  }, [page]);

  async function fetchVehicles() {
    try {
      const data = await getVehicles({ limit: 100 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setVehicles(list);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }

  async function fetchItems() {
    try {
      setIsLoading(true);
      const data = await getFleetMaintenance({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching fleet maintenance:', error);
      toast.push({ type: 'error', message: 'Error cargando reportes' });
    } finally {
      setIsLoading(false);
    }
  }

  function openNewModal() {
    setEditingItem(null);
    setFormData({
      vehicleId: '',
      description: '',
      severity: 'MEDIUM',
    });
    setShowModal(true);
  }

  function openEditModal(item: FleetMaintenanceReport) {
    setEditingItem(item);
    setFormData({
      vehicleId: item.vehicleId,
      description: item.description || '',
      severity: item.severity || 'MEDIUM',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        description: formData.description,
        severity: formData.severity,
      };

      if (editingItem) {
        await updateFleetMaintenance(editingItem.id, payload);
        toast.push({ type: 'success', message: 'Reporte actualizado' });
      } else {
        await createFleetMaintenance(payload);
        toast.push({ type: 'success', message: 'Reporte creado' });
      }
      setShowModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving fleet maintenance:', error);
      toast.push({ type: 'error', message: 'Error al guardar el reporte' });
    }
  }

  async function handleDelete(item: FleetMaintenanceReport) {
    if (!confirmAction('¿Eliminar este reporte de mantenimiento?')) {
      return;
    }

    try {
      await deleteFleetMaintenance(item.id);
      toast.push({ type: 'success', message: 'Reporte eliminado' });
      fetchItems();
    } catch (error) {
      console.error('Error deleting fleet maintenance:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el reporte' });
    }
  }

  function getSeverityColor(severity: string | null) {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getSeverityLabel(severity: string | null) {
    switch (severity) {
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Media';
      case 'LOW':
        return 'Baja';
      default:
        return '-';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'OPEN':
        return 'Abierto';
      case 'IN_PROGRESS':
        return 'En Progreso';
      case 'CLOSED':
        return 'Cerrado';
      default:
        return status;
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = search
      ? item.vehicle?.licensePlate?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesSeverity = filterSeverity ? item.severity === filterSeverity : true;
    const matchesStatus = filterStatus ? item.status === filterStatus : true;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reportes de Mantenimiento de Flota</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Reporte
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por vehículo o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las severidades</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="OPEN">Abierto</option>
          <option value="IN_PROGRESS">En Progreso</option>
          <option value="CLOSED">Cerrado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.severity === 'HIGH' ? 'bg-red-100' :
                      item.severity === 'MEDIUM' ? 'bg-yellow-100' :
                      'bg-green-100'
                    }`}>
                      <ExclamationTriangleIcon className={`h-5 w-5 ${
                        item.severity === 'HIGH' ? 'text-red-600' :
                        item.severity === 'MEDIUM' ? 'text-yellow-600' :
                        'text-green-600'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.vehicle?.licensePlate || '-'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.vehicle?.make} {item.vehicle?.model}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-md truncate">
                    {item.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(item.date).toLocaleDateString('es-PA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(item.severity)}`}>
                    {getSeverityLabel(item.severity)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 text-gray-400 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron reportes de mantenimiento
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingItem ? 'Editar Reporte' : 'Nuevo Reporte de Mantenimiento'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehículo *
                  </label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Seleccionar vehículo...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severidad *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' })}
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="LOW">Baja - Puede esperar</option>
                    <option value="MEDIUM">Media - Atender pronto</option>
                    <option value="HIGH">Alta - Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción del Problema *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={4}
                    placeholder="Describa el problema o incidente observado..."
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {editingItem ? 'Guardar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
