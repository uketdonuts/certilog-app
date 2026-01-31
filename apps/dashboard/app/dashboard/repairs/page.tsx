'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  WrenchIcon,
} from '@heroicons/react/24/outline';
import { getRepairs, createRepair, updateRepair, deleteRepair, getVehicles } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
}

interface Repair {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  date: string;
  performedBy: string | null;
  description: string;
  cost: number | null;
  createdAt: string;
}

export default function RepairsPage() {
  const [items, setItems] = useState<Repair[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Repair | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    description: '',
    cost: '',
    performedAt: '',
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
      const data = await getRepairs({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching repairs:', error);
      toast.push({ type: 'error', message: 'Error cargando reparaciones' });
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
      description: '',
      cost: '',
      performedAt: localDateTime,
    });
    setShowModal(true);
  }

  function openEditModal(item: Repair) {
    setEditingItem(item);
    setFormData({
      vehicleId: item.vehicleId,
      description: item.description || '',
      cost: item.cost?.toString() || '',
      performedAt: formatDateTimeLocal(item.date),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        description: formData.description,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        performedAt: formData.performedAt ? new Date(formData.performedAt).toISOString() : undefined,
      };

      if (editingItem) {
        await updateRepair(editingItem.id, payload);
        toast.push({ type: 'success', message: 'Reparación actualizada' });
      } else {
        await createRepair(payload);
        toast.push({ type: 'success', message: 'Reparación creada' });
      }
      setShowModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving repair:', error);
      toast.push({ type: 'error', message: 'Error al guardar la reparación' });
    }
  }

  async function handleDelete(item: Repair) {
    if (!confirmAction('¿Eliminar esta reparación?')) {
      return;
    }

    try {
      await deleteRepair(item.id);
      toast.push({ type: 'success', message: 'Reparación eliminada' });
      fetchItems();
    } catch (error) {
      console.error('Error deleting repair:', error);
      toast.push({ type: 'error', message: 'Error al eliminar la reparación' });
    }
  }

  function formatCurrency(amount: number | null) {
    if (amount === null || amount === undefined) return '-';
    return `$${Number(amount).toFixed(2)}`;
  }

  const filteredItems = items.filter(item => {
    if (!search) return true;
    return (
      item.vehicle?.licensePlate?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reparaciones</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Reparación
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por vehículo o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <WrenchIcon className="h-5 w-5 text-orange-600" />
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
                  {item.date ? new Date(item.date).toLocaleDateString('es-PA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.cost)}
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
            No se encontraron reparaciones
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
                {editingItem ? 'Editar Reparación' : 'Nueva Reparación'}
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
                    Descripción *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    placeholder="Descripción del trabajo realizado..."
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.performedAt}
                      onChange={(e) => setFormData({ ...formData, performedAt: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0.00"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
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
