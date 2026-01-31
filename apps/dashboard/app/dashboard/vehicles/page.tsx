'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  color: string | null;
  active: boolean;
  driverId: string | null;
  driver?: { id: string; fullName: string } | null;
  createdAt: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    color: '',
  });

  const toast = useToast();

  useEffect(() => {
    fetchVehicles();
  }, [search, page]);

  async function fetchVehicles() {
    try {
      setIsLoading(true);
      const data = await getVehicles({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      // Filter by search client-side if API doesn't support it
      const filtered = search
        ? list.filter((v: Vehicle) =>
            v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
            v.make?.toLowerCase().includes(search.toLowerCase()) ||
            v.model?.toLowerCase().includes(search.toLowerCase())
          )
        : list;
      setVehicles(filtered);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || filtered.length);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.push({ type: 'error', message: 'Error cargando vehículos' });
    } finally {
      setIsLoading(false);
    }
  }

  function openNewModal() {
    setEditingVehicle(null);
    setFormData({ licensePlate: '', make: '', model: '', year: '', vin: '', color: '' });
    setShowModal(true);
  }

  function openEditModal(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setFormData({
      licensePlate: vehicle.licensePlate,
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      vin: vehicle.vin || '',
      color: vehicle.color || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        licensePlate: formData.licensePlate.toUpperCase(),
        make: formData.make || undefined,
        model: formData.model || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        vin: formData.vin || undefined,
      };

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
        toast.push({ type: 'success', message: 'Vehículo actualizado' });
      } else {
        await createVehicle(payload);
        toast.push({ type: 'success', message: 'Vehículo creado' });
      }
      setShowModal(false);
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.push({ type: 'error', message: 'Error al guardar el vehículo' });
    }
  }

  async function handleDelete(vehicle: Vehicle) {
    if (!confirmAction(`¿Eliminar el vehículo ${vehicle.licensePlate}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteVehicle(vehicle.id);
      toast.push({ type: 'success', message: 'Vehículo eliminado' });
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el vehículo' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Vehículo
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por placa, marca o modelo..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Año</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VIN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conductor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <TruckIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {vehicle.make || 'Sin marca'} {vehicle.model || ''}
                      </div>
                      {vehicle.color && (
                        <div className="text-sm text-gray-500">{vehicle.color}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-sm font-mono bg-gray-100 rounded">
                    {vehicle.licensePlate}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.year || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {vehicle.vin || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {vehicle.driver?.fullName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    vehicle.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vehicle.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(vehicle)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle)}
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

        {vehicles.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron vehículos
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
                {editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    required
                    placeholder="ABC-1234"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      placeholder="Toyota"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Hilux"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Año
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      placeholder="2024"
                      min="1900"
                      max="2100"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="Blanco"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VIN (Número de Serie)
                  </label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    placeholder="1HGBH41JXMN109186"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 uppercase font-mono"
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
                    {editingVehicle ? 'Guardar' : 'Crear'}
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
