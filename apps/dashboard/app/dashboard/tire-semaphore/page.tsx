'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getTireSemaphores, createTireSemaphore, updateTireSemaphore, deleteTireSemaphore, getVehicles } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
}

interface TireSemaphore {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  inspectorId: string | null;
  inspector?: { id: string; fullName: string } | null;
  frontLeft: 'GOOD' | 'WARNING' | 'REPLACE';
  frontRight: 'GOOD' | 'WARNING' | 'REPLACE';
  rearLeft: 'GOOD' | 'WARNING' | 'REPLACE';
  rearRight: 'GOOD' | 'WARNING' | 'REPLACE';
  notes: string | null;
  recordedAt: string;
  createdAt: string;
}

type TireCondition = 'GOOD' | 'WARNING' | 'REPLACE';

export default function TireSemaphorePage() {
  const [items, setItems] = useState<TireSemaphore[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TireSemaphore | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    frontLeft: 'GOOD' as TireCondition,
    frontRight: 'GOOD' as TireCondition,
    rearLeft: 'GOOD' as TireCondition,
    rearRight: 'GOOD' as TireCondition,
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
      const data = await getTireSemaphores({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching tire semaphores:', error);
      toast.push({ type: 'error', message: 'Error cargando registros' });
    } finally {
      setIsLoading(false);
    }
  }

  function openNewModal() {
    setEditingItem(null);
    setFormData({
      vehicleId: '',
      frontLeft: 'GOOD',
      frontRight: 'GOOD',
      rearLeft: 'GOOD',
      rearRight: 'GOOD',
      notes: '',
    });
    setShowModal(true);
  }

  function openEditModal(item: TireSemaphore) {
    setEditingItem(item);
    setFormData({
      vehicleId: item.vehicleId,
      frontLeft: item.frontLeft,
      frontRight: item.frontRight,
      rearLeft: item.rearLeft,
      rearRight: item.rearRight,
      notes: item.notes || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        frontLeft: formData.frontLeft,
        frontRight: formData.frontRight,
        rearLeft: formData.rearLeft,
        rearRight: formData.rearRight,
        notes: formData.notes || undefined,
      };

      if (editingItem) {
        await updateTireSemaphore(editingItem.id, payload);
        toast.push({ type: 'success', message: 'Registro actualizado' });
      } else {
        await createTireSemaphore(payload);
        toast.push({ type: 'success', message: 'Registro creado' });
      }
      setShowModal(false);
      fetchItems();
    } catch (error) {
      console.error('Error saving tire semaphore:', error);
      toast.push({ type: 'error', message: 'Error al guardar el registro' });
    }
  }

  async function handleDelete(item: TireSemaphore) {
    if (!confirmAction('¿Eliminar este registro de semáforo de llantas?')) {
      return;
    }

    try {
      await deleteTireSemaphore(item.id);
      toast.push({ type: 'success', message: 'Registro eliminado' });
      fetchItems();
    } catch (error) {
      console.error('Error deleting tire semaphore:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el registro' });
    }
  }

  function getConditionColor(condition: TireCondition) {
    switch (condition) {
      case 'GOOD':
        return 'bg-green-500';
      case 'WARNING':
        return 'bg-yellow-500';
      case 'REPLACE':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  }

  function getConditionLabel(condition: TireCondition) {
    switch (condition) {
      case 'GOOD':
        return 'Bueno';
      case 'WARNING':
        return 'Precaución';
      case 'REPLACE':
        return 'Reemplazar';
      default:
        return condition;
    }
  }

  function TireIndicator({ condition }: { condition: TireCondition }) {
    return (
      <div className={`w-4 h-4 rounded-full ${getConditionColor(condition)}`} title={getConditionLabel(condition)} />
    );
  }

  function getWorstCondition(item: TireSemaphore): TireCondition {
    const conditions = [item.frontLeft, item.frontRight, item.rearLeft, item.rearRight];
    if (conditions.includes('REPLACE')) return 'REPLACE';
    if (conditions.includes('WARNING')) return 'WARNING';
    return 'GOOD';
  }

  const filteredItems = items.filter(item => {
    if (!search) return true;
    return item.vehicle?.licensePlate?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Semáforo de Llantas</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Inspección
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span>Bueno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500" />
          <span>Precaución</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span>Reemplazar</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por placa..."
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
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Del. Izq</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Del. Der</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tras. Izq</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tras. Der</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const worstCondition = getWorstCondition(item);
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          <circle cx="12" cy="12" r="3" strokeWidth="2" />
                        </svg>
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <TireIndicator condition={item.frontLeft} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <TireIndicator condition={item.frontRight} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <TireIndicator condition={item.rearLeft} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <TireIndicator condition={item.rearRight} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.recordedAt).toLocaleDateString('es-PA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      worstCondition === 'GOOD'
                        ? 'bg-green-100 text-green-800'
                        : worstCondition === 'WARNING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {getConditionLabel(worstCondition)}
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
              );
            })}
          </tbody>
        </table>

        {filteredItems.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron registros de semáforo de llantas
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
                {editingItem ? 'Editar Inspección' : 'Nueva Inspección de Llantas'}
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

                {/* Tire diagram */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-4 text-center">Estado de las Llantas</div>
                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                    {/* Front */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center">Delantera Izq.</label>
                      <select
                        value={formData.frontLeft}
                        onChange={(e) => setFormData({ ...formData, frontLeft: e.target.value as TireCondition })}
                        className={`w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 ${
                          formData.frontLeft === 'GOOD' ? 'bg-green-50 border-green-300' :
                          formData.frontLeft === 'WARNING' ? 'bg-yellow-50 border-yellow-300' :
                          'bg-red-50 border-red-300'
                        }`}
                      >
                        <option value="GOOD">Bueno</option>
                        <option value="WARNING">Precaución</option>
                        <option value="REPLACE">Reemplazar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center">Delantera Der.</label>
                      <select
                        value={formData.frontRight}
                        onChange={(e) => setFormData({ ...formData, frontRight: e.target.value as TireCondition })}
                        className={`w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 ${
                          formData.frontRight === 'GOOD' ? 'bg-green-50 border-green-300' :
                          formData.frontRight === 'WARNING' ? 'bg-yellow-50 border-yellow-300' :
                          'bg-red-50 border-red-300'
                        }`}
                      >
                        <option value="GOOD">Bueno</option>
                        <option value="WARNING">Precaución</option>
                        <option value="REPLACE">Reemplazar</option>
                      </select>
                    </div>
                    {/* Rear */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center">Trasera Izq.</label>
                      <select
                        value={formData.rearLeft}
                        onChange={(e) => setFormData({ ...formData, rearLeft: e.target.value as TireCondition })}
                        className={`w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 ${
                          formData.rearLeft === 'GOOD' ? 'bg-green-50 border-green-300' :
                          formData.rearLeft === 'WARNING' ? 'bg-yellow-50 border-yellow-300' :
                          'bg-red-50 border-red-300'
                        }`}
                      >
                        <option value="GOOD">Bueno</option>
                        <option value="WARNING">Precaución</option>
                        <option value="REPLACE">Reemplazar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 text-center">Trasera Der.</label>
                      <select
                        value={formData.rearRight}
                        onChange={(e) => setFormData({ ...formData, rearRight: e.target.value as TireCondition })}
                        className={`w-full border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-500 ${
                          formData.rearRight === 'GOOD' ? 'bg-green-50 border-green-300' :
                          formData.rearRight === 'WARNING' ? 'bg-yellow-50 border-yellow-300' :
                          'bg-red-50 border-red-300'
                        }`}
                      >
                        <option value="GOOD">Bueno</option>
                        <option value="WARNING">Precaución</option>
                        <option value="REPLACE">Reemplazar</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Observaciones adicionales..."
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
