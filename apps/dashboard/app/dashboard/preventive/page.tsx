'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { getPreventives, createPreventive, updatePreventive, deletePreventive, getVehicles } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
}

interface PreventiveMaintenance {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  scheduledAt: string;
  performedAt: string | null;
  type: string | null;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export default function PreventivePage() {
  const [items, setItems] = useState<PreventiveMaintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PreventiveMaintenance | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    scheduledAt: '',
    performedAt: '',
    type: '',
    notes: '',
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
      const data = await getPreventives({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching preventive maintenance:', error);
      toast.push({ type: 'error', message: 'Error cargando registros' });
    } finally {
      setIsLoading(false);
    }
  }

  function formatDateTimeLocal(dateStr: string | null) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  function openNewModal() {
    setEditingItem(null);
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormData({
      vehicleId: '',
      scheduledAt: localDateTime,
      performedAt: '',
      type: '',
      notes: '',
    });
    setShowModal(true);
  }

  function openEditModal(item: PreventiveMaintenance) {
    setEditingItem(item);
    setFormData({
      vehicleId: item.vehicleId,
      scheduledAt: formatDateTimeLocal(item.scheduledAt),
      performedAt: formatDateTimeLocal(item.performedAt),
      type: item.type || '',
      notes: item.notes || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        performedAt: formData.performedAt ? new Date(formData.performedAt).toISOString() : undefined,
        type: formData.type || undefined,
        notes: formData.notes || undefined,
      };

      if (editingItem) {
        await updatePreventive(editingItem.id, payload);
        toast.push({ type: 'success', message: 'Registro actualizado' });
      } else {
        await createPreventive(payload);
        toast.push({ type: 'success', message: 'Registro creado' });
      }
      setShowModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving preventive maintenance:', error);
      toast.push({ type: 'error', message: 'Error al guardar el registro' });
    }
  }

  async function handleDelete(item: PreventiveMaintenance) {
    if (!confirmAction('¿Eliminar este mantenimiento preventivo?')) {
      return;
    }

    try {
      await deletePreventive(item.id);
      toast.push({ type: 'success', message: 'Registro eliminado' });
      fetchItems();
    } catch (error) {
      console.error('Error deleting preventive maintenance:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el registro' });
    }
  }

  async function markAsPerformed(item: PreventiveMaintenance) {
    try {
      await updatePreventive(item.id, {
        performedAt: new Date().toISOString(),
      });
      toast.push({ type: 'success', message: 'Marcado como realizado' });
      fetchItems();
    } catch (error) {
      console.error('Error updating preventive maintenance:', error);
      toast.push({ type: 'error', message: 'Error al actualizar' });
    }
  }

  function getStatus(item: PreventiveMaintenance): 'completed' | 'pending' | 'overdue' {
    if (item.performedAt) return 'completed';
    const scheduled = new Date(item.scheduledAt);
    const now = new Date();
    return scheduled < now ? 'overdue' : 'pending';
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = search
      ? item.vehicle?.licensePlate?.toLowerCase().includes(search.toLowerCase()) ||
        item.type?.toLowerCase().includes(search.toLowerCase()) ||
        item.notes?.toLowerCase().includes(search.toLowerCase())
      : true;

    if (!filterStatus) return matchesSearch;

    const status = getStatus(item);
    return matchesSearch && status === filterStatus;
  });

  const maintenanceTypes = [
    'Cambio de aceite',
    'Rotación de llantas',
    'Revisión de frenos',
    'Cambio de filtros',
    'Alineación y balanceo',
    'Revisión general',
    'Otro',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mantenimiento Preventivo</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Mantenimiento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por vehículo o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="overdue">Vencidos</option>
          <option value="completed">Realizados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Realizado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600" />
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.scheduledAt).toLocaleDateString('es-PA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.performedAt
                      ? new Date(item.performedAt).toLocaleDateString('es-PA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${
                      status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {status === 'completed' ? (
                        <><CheckCircleIcon className="h-3 w-3" /> Realizado</>
                      ) : status === 'overdue' ? (
                        <><ClockIcon className="h-3 w-3" /> Vencido</>
                      ) : (
                        <><ClockIcon className="h-3 w-3" /> Pendiente</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {status !== 'completed' && (
                        <button
                          onClick={() => markAsPerformed(item)}
                          className="p-2 text-gray-400 hover:text-green-600 transition"
                          title="Marcar como realizado"
                        >
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                      )}
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
              );
            })}
          </tbody>
        </table>

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron registros de mantenimiento preventivo
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
                {editingItem ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento Preventivo'}
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
                    Tipo de Mantenimiento
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {maintenanceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Programada *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                      required
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Realizado
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.performedAt}
                      onChange={(e) => setFormData({ ...formData, performedAt: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Notas adicionales sobre el mantenimiento..."
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
