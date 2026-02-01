'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getGasReports, createGasReport, updateGasReport, deleteGasReport, getVehicles } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
}

interface GasReport {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  reportedBy: string | null;
  reporter?: { id: string; fullName: string } | null;
  date: string;
  liters: number;
  cost: number | null;
  odometer: number | null;
  fuelType: string | null;
  notes: string | null;
  createdAt: string;
}

export default function GasPage() {
  const [reports, setReports] = useState<GasReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<GasReport | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    liters: '',
    cost: '',
    odometer: '',
    fuelType: 'REGULAR',
    notes: '',
  });

  const toast = useToast();

  useEffect(() => {
    fetchReports();
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

  async function fetchReports() {
    try {
      setIsLoading(true);
      const data = await getGasReports({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setReports(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching gas reports:', error);
      toast.push({ type: 'error', message: 'Error cargando reportes' });
    } finally {
      setIsLoading(false);
    }
  }

  function openNewModal() {
    setEditingReport(null);
    setFormData({ vehicleId: '', liters: '', cost: '', odometer: '', fuelType: 'REGULAR', notes: '' });
    setShowModal(true);
  }

  function openEditModal(report: GasReport) {
    setEditingReport(report);
    setFormData({
      vehicleId: report.vehicleId,
      liters: report.liters?.toString() || '',
      cost: report.cost?.toString() || '',
      odometer: report.odometer?.toString() || '',
      fuelType: report.fuelType || 'REGULAR',
      notes: report.notes || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: formData.vehicleId,
        liters: parseFloat(formData.liters),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        odometer: formData.odometer ? parseInt(formData.odometer) : undefined,
        fuelType: formData.fuelType || undefined,
        notes: formData.notes || undefined,
      };

      if (editingReport) {
        await updateGasReport(editingReport.id, payload);
        toast.push({ type: 'success', message: 'Reporte actualizado' });
      } else {
        await createGasReport(payload);
        toast.push({ type: 'success', message: 'Reporte creado' });
      }
      setShowModal(false);
      fetchReports();
    } catch (error) {
      console.error('Error saving gas report:', error);
      toast.push({ type: 'error', message: 'Error al guardar el reporte' });
    }
  }

  async function handleDelete(report: GasReport) {
    if (!confirmAction('¿Eliminar este reporte de gasolina?')) {
      return;
    }

    try {
      await deleteGasReport(report.id);
      toast.push({ type: 'success', message: 'Reporte eliminado' });
      fetchReports();
    } catch (error) {
      console.error('Error deleting gas report:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el reporte' });
    }
  }

  function getVehicleDisplay(report: GasReport) {
    if (report.vehicle) {
      return `${report.vehicle.licensePlate} - ${report.vehicle.make || ''} ${report.vehicle.model || ''}`.trim();
    }
    const v = vehicles.find(v => v.id === report.vehicleId);
    return v ? `${v.licensePlate} - ${v.make || ''} ${v.model || ''}`.trim() : report.vehicleId;
  }

  function formatCurrency(amount: number | string | null) {
    if (amount === null || amount === undefined) return '-';
    return `$${Number(amount).toFixed(2)}`;
  }

  const filteredReports = search
    ? reports.filter(r =>
        getVehicleDisplay(r).toLowerCase().includes(search.toLowerCase()) ||
        r.fuelType?.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reportes de Gasolina</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Reporte
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por vehículo..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Litros</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odómetro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {report.vehicle?.licensePlate || '-'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.vehicle?.make} {report.vehicle?.model}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(report.date).toLocaleDateString('es-PA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{report.liters} L</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(report.cost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {report.odometer ? `${report.odometer.toLocaleString()} km` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    report.fuelType === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                    report.fuelType === 'DIESEL' ? 'bg-gray-100 text-gray-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {report.fuelType || 'REGULAR'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(report)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(report)}
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

        {filteredReports.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron reportes de gasolina
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
                {editingReport ? 'Editar Reporte' : 'Nuevo Reporte de Gasolina'}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Litros *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.liters}
                      onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                      required
                      placeholder="0.00"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Odómetro (km)
                    </label>
                    <input
                      type="number"
                      value={formData.odometer}
                      onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                      placeholder="0"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Combustible
                    </label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="REGULAR">Regular</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="DIESEL">Diesel</option>
                    </select>
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
                    placeholder="Notas adicionales..."
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
                    {editingReport ? 'Guardar' : 'Crear'}
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
