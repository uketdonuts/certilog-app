'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  XMarkIcon,
  MapPinIcon,
  PhotoIcon,
  PencilSquareIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  StarIcon,
  VideoCameraIcon,
  LinkIcon,
  CalendarIcon,
  NoSymbolIcon,
  EllipsisVerticalIcon,
  TruckIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import {
  getDeliveries,
  getDeliveryById,
  getDeliveryRoute,
  getCouriers,
  getCustomers,
  createDelivery,
  assignDelivery,
  importDeliveriesFromExcel,
  downloadImportTemplate,
  exportDeliveriesToExcel,
  rescheduleDelivery,
  cancelDelivery,
} from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import Pagination from '@/components/Pagination';
import DeliveryProductsModal from '@/components/DeliveryProductsModal';
import { formatPanamaDateTime } from '@/lib/utils/dateFormat';

const DeliveryRouteMap = dynamic(() => import('../map/DeliveryRouteMapClient'), { ssr: false });

interface DeliveryPhoto {
  id: string;
  url: string;
  createdAt: string;
}

interface Delivery {
  id: string;
  trackingCode: string;
  publicTrackingToken?: string;
  status: string;
  priority: string;
  description: string | null;
  scheduledDate?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  courier?: {
    id: string;
    fullName: string;
    phone: string;
  };
  createdAt: string;
  deliveredAt: string | null;
  photoUrl?: string;
  signatureUrl?: string;
  videoUrl?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryNotes?: string;
  rating?: number;
  photos?: DeliveryPhoto[];
  rescheduledFrom?: string | null;
  rescheduledCount?: number;
  rescheduleReason?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
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
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Delivery | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<Delivery | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState<Delivery | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<Delivery | null>(null);
  const [showProductsModal, setShowProductsModal] = useState<Delivery | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [routePoints, setRoutePoints] = useState<Array<{ lat: number; lng: number; recordedAt: string }>>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    deliveriesCreated: number;
    customersCreated: number;
    totalRows: number;
    errors: string[];
  } | null>(null);

  const toast = useToast();

  // New delivery form
  const [newDelivery, setNewDelivery] = useState({
    customerId: '',
    description: '',
    priority: 'NORMAL',
    courierId: '',
  });

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, createdAtFrom, createdAtTo, page]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      if (!showDetailsModal?.id) {
        setRoutePoints([]);
        setRouteLoading(false);
        return;
      }

      setRouteLoading(true);
      try {
        const route = await getDeliveryRoute(showDetailsModal.id, { limit: 10000 });
        const points = Array.isArray(route?.points) ? route.points : [];
        if (!cancelled) setRoutePoints(points);
      } catch {
        if (!cancelled) setRoutePoints([]);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }

    fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [showDetailsModal?.id]);

  async function fetchData() {
    try {
      const [deliveriesData, couriersData, customersData] = await Promise.all([
        getDeliveries({
          search,
          status: statusFilter || undefined,
          createdAtFrom: createdAtFrom ? new Date(createdAtFrom).toISOString() : undefined,
          createdAtTo: createdAtTo ? new Date(createdAtTo + 'T23:59:59').toISOString() : undefined,
          page,
          limit: 20,
        }),
        getCouriers(),
        getCustomers({ limit: 100 }),
      ]);

      // Ensure data is always an array
      const deliveriesList = Array.isArray(deliveriesData?.data) ? deliveriesData.data : Array.isArray(deliveriesData) ? deliveriesData : [];
      const couriersList = Array.isArray(couriersData) ? couriersData : [];
      const customersList = Array.isArray(customersData?.data) ? customersData.data : Array.isArray(customersData) ? customersData : [];

      setDeliveries(deliveriesList);
      setTotalPages(deliveriesData?.totalPages || 1);
      setTotalItems(deliveriesData?.total || 0);
      setCouriers(couriersList);
      setCustomers(customersList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportExcel() {
    setExportLoading(true);
    try {
      await exportDeliveriesToExcel({
        search: search || undefined,
        status: statusFilter || undefined,
        createdAtFrom: createdAtFrom ? new Date(createdAtFrom).toISOString() : undefined,
        createdAtTo: createdAtTo ? new Date(createdAtTo + 'T23:59:59').toISOString() : undefined,
      });
    } catch (error) {
      console.error('Error exporting deliveries:', error);
      toast.push({ type: 'error', message: 'Error al exportar entregas' });
    } finally {
      setExportLoading(false);
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
      const msg = (error as any)?.response?.data?.error;
      toast.push({ type: 'error', message: msg || 'Error al crear la entrega' });
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
      const msg = (error as any)?.response?.data?.error;
      toast.push({ type: 'error', message: msg || 'Error al asignar la entrega' });
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!showRescheduleModal) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const scheduledDate = formData.get('scheduledDate') as string;
    const reason = formData.get('reason') as string;
    
    if (!scheduledDate) {
      toast.push({ type: 'error', message: 'Debes seleccionar una fecha' });
      return;
    }
    
    try {
      await rescheduleDelivery(showRescheduleModal.id, { 
        scheduledDate: new Date(scheduledDate).toISOString(),
        reason: reason || undefined 
      });
      setShowRescheduleModal(null);
      fetchData();
      toast.push({ type: 'success', message: 'Entrega reagendada exitosamente' });
    } catch (error) {
      console.error('Error rescheduling delivery:', error);
      const msg = (error as any)?.response?.data?.error;
      toast.push({ type: 'error', message: msg || 'Error al reagendar la entrega' });
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!showCancelModal) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const reason = formData.get('reason') as string;
    
    if (!reason || reason.trim().length < 3) {
      toast.push({ type: 'error', message: 'Debes proporcionar un motivo de cancelación (mínimo 3 caracteres)' });
      return;
    }
    
    try {
      await cancelDelivery(showCancelModal.id, reason);
      setShowCancelModal(null);
      fetchData();
      toast.push({ type: 'success', message: 'Entrega cancelada exitosamente' });
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      const msg = (error as any)?.response?.data?.error;
      toast.push({ type: 'error', message: msg || 'Error al cancelar la entrega' });
    }
  }

  async function handleViewDetails(delivery: Delivery) {
    setLoadingDetails(true);
    try {
      const details = await getDeliveryById(delivery.id);
      setShowDetailsModal(details);
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      toast.push({ type: 'error', message: 'Error al cargar los detalles de la entrega' });
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const result = await importDeliveriesFromExcel(importFile);
      setImportResult(result);
      if (result.deliveriesCreated > 0) {
        fetchData(); // Refresh deliveries list
      }
    } catch (error) {
      console.error('Error importing deliveries:', error);
      toast.push({ type: 'error', message: 'Error al importar entregas' });
    } finally {
      setImportLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadImportTemplate();
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.push({ type: 'error', message: 'Error al descargar plantilla' });
    }
  }

  function handleCloseImportModal() {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
  }

  // Build the full URL for photos (API base URL + relative path)
  const getPhotoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Remove '/api' from the end if present since uploads are served from root
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2120').replace(/\/api$/, '');
    return `${apiUrl}${url}`;
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_TRANSIT: 'bg-purple-100 text-purple-800',
    DELIVERED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    ASSIGNED: 'Asignada',
    IN_TRANSIT: 'En tránsito',
    DELIVERED: 'Entregada',
    FAILED: 'Fallida',
    CANCELLED: 'Cancelada',
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
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            {exportLoading ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Importar Excel
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Entrega
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, cliente o dirección..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="ASSIGNED">Asignadas</option>
            <option value="IN_TRANSIT">En tránsito</option>
            <option value="DELIVERED">Entregadas</option>
            <option value="FAILED">Fallidas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Creado:</label>
          <input
            type="date"
            value={createdAtFrom}
            onChange={(e) => { setCreatedAtFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={createdAtTo}
            onChange={(e) => { setCreatedAtTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
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
                  Creado
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatPanamaDateTime(delivery.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === delivery.id ? null : delivery.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Acciones"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                      </button>
                      
                      {openMenuId === delivery.id && (
                        <>
                          {/* Backdrop to close menu when clicking outside */}
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          {/* Dropdown menu */}
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => {
                                handleViewDetails(delivery);
                                setOpenMenuId(null);
                              }}
                              disabled={loadingDetails}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <EyeIcon className="h-4 w-4 text-gray-500" />
                              Ver detalles
                            </button>
                            
                            {delivery.publicTrackingToken && (
                              <a
                                href={`/track/${delivery.publicTrackingToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpenMenuId(null)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <TruckIcon className="h-4 w-4 text-green-600" />
                                Ver seguimiento
                              </a>
                            )}

                            {/* Products button - available for all statuses */}
                            <button
                              onClick={() => {
                                setShowProductsModal(delivery);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <CubeIcon className="h-4 w-4 text-blue-600" />
                              Productos
                            </button>
                            
                            {(delivery.status === 'PENDING' || delivery.status === 'ASSIGNED') && (
                              <button
                                onClick={() => {
                                  setShowAssignModal(delivery);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <TruckIcon className="h-4 w-4 text-primary-600" />
                                {delivery.courier ? 'Reasignar' : 'Asignar'}
                              </button>
                            )}
                            
                            {(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'FAILED'].includes(delivery.status)) && (
                              <button
                                onClick={() => {
                                  setShowRescheduleModal(delivery);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <CalendarIcon className="h-4 w-4 text-orange-500" />
                                Reagendar
                              </button>
                            )}
                            
                            {(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'FAILED'].includes(delivery.status)) && (
                              <button
                                onClick={() => {
                                  setShowCancelModal(delivery);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <NoSymbolIcon className="h-4 w-4 text-red-500" />
                                Cancelar
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
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

      {/* Delivery Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowDetailsModal(null)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Detalles de Entrega
                  </h2>
                  <p className="text-sm text-gray-500">
                    {showDetailsModal.trackingCode}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status and Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Estado</h3>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          statusColors[showDetailsModal.status]
                        }`}
                      >
                        {statusLabels[showDetailsModal.status]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Prioridad</h3>
                      <span className={`text-sm font-medium ${priorityColors[showDetailsModal.priority]}`}>
                        {showDetailsModal.priority}
                      </span>
                    </div>
                    {showDetailsModal.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Descripción</h3>
                        <p className="text-gray-900">{showDetailsModal.description}</p>
                      </div>
                    )}
                    {showDetailsModal.deliveredAt && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Entregado</h3>
                        <p className="text-gray-900">
                          {new Date(showDetailsModal.deliveredAt).toLocaleString('es-ES')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Cliente</h3>
                      <p className="text-gray-900 font-medium">{showDetailsModal.customer.name}</p>
                      <p className="text-sm text-gray-600">{showDetailsModal.customer.phone}</p>
                      <p className="text-sm text-gray-600">{showDetailsModal.customer.address}</p>
                    </div>
                    {showDetailsModal.courier && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Mensajero</h3>
                        <p className="text-gray-900 font-medium">{showDetailsModal.courier.fullName}</p>
                        <p className="text-sm text-gray-600">{showDetailsModal.courier.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Notes */}
                {showDetailsModal.deliveryNotes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <PencilSquareIcon className="h-4 w-4" />
                      Notas de Entrega
                    </h3>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {showDetailsModal.deliveryNotes}
                    </p>
                  </div>
                )}

                {/* Location */}
                {(showDetailsModal.deliveryLat != null && showDetailsModal.deliveryLng != null) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      Ubicación de Entrega
                    </h3>
                    <div className="bg-gray-100 rounded-lg overflow-hidden">
                      <a
                        href={`https://www.google.com/maps?q=${showDetailsModal.deliveryLat},${showDetailsModal.deliveryLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 hover:bg-gray-200 transition"
                      >
                        <div className="flex items-center gap-2 text-primary-600">
                          <MapPinIcon className="h-5 w-5" />
                          <span>Ver en Google Maps</span>
                        </div>
                      </a>
                    </div>
                  </div>
                )}

                {/* Route */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    Ruta realizada
                  </h3>

                  {routeLoading ? (
                    <div className="flex items-center justify-center h-72 bg-gray-50 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                    </div>
                  ) : routePoints.length > 0 ? (
                    <DeliveryRouteMap
                      points={routePoints}
                      destination={
                        showDetailsModal.deliveryLat != null && showDetailsModal.deliveryLng != null
                          ? {
                              lat: Number(showDetailsModal.deliveryLat as any),
                              lng: Number(showDetailsModal.deliveryLng as any),
                              label: 'Entrega',
                            }
                          : showDetailsModal.customer.latitude != null && showDetailsModal.customer.longitude != null
                            ? {
                                lat: Number(showDetailsModal.customer.latitude as any),
                                lng: Number(showDetailsModal.customer.longitude as any),
                                label: 'Cliente',
                              }
                            : null
                      }
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                      No hay ruta registrada para esta entrega (aún).
                    </div>
                  )}
                </div>

                {/* Signature */}
                {showDetailsModal.signatureUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <PencilSquareIcon className="h-4 w-4" />
                      Firma del Receptor
                    </h3>
                    <div className="bg-white border rounded-lg p-4 inline-block">
                      <img
                        src={getPhotoUrl(showDetailsModal.signatureUrl)}
                        alt="Firma del receptor"
                        className="max-h-32 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Photos */}
                {(showDetailsModal.photoUrl || (showDetailsModal.photos && showDetailsModal.photos.length > 0)) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <PhotoIcon className="h-4 w-4" />
                      Fotos de Entrega
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {showDetailsModal.photoUrl && (
                        <a
                          href={getPhotoUrl(showDetailsModal.photoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={getPhotoUrl(showDetailsModal.photoUrl)}
                            alt="Foto de entrega"
                            className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition"
                          />
                        </a>
                      )}
                      {showDetailsModal.photos?.map((photo) => (
                        <a
                          key={photo.id}
                          href={getPhotoUrl(photo.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={getPhotoUrl(photo.url)}
                            alt="Foto de entrega"
                            className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rating */}
                {showDetailsModal.rating != null && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <StarIcon className="h-4 w-4" />
                      Calificación
                    </h3>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-5 w-5 ${
                            i < (showDetailsModal.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-lg font-semibold text-yellow-600">
                        {showDetailsModal.rating}/10
                      </span>
                    </div>
                  </div>
                )}

                {/* Video */}
                {showDetailsModal.videoUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <VideoCameraIcon className="h-4 w-4" />
                      Video de Entrega
                    </h3>
                    <video
                      src={getPhotoUrl(showDetailsModal.videoUrl)}
                      controls
                      className="w-full max-w-md rounded-lg"
                    />
                  </div>
                )}

                {/* Reschedule Info */}
                {(showDetailsModal.rescheduledCount && showDetailsModal.rescheduledCount > 0) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Información de Reagendamiento
                    </h3>
                    <p className="text-sm text-orange-700">
                      Esta entrega ha sido reagendada <strong>{showDetailsModal.rescheduledCount}</strong> vez/veces
                    </p>
                    {showDetailsModal.rescheduledFrom && (
                      <p className="text-sm text-orange-700 mt-1">
                        Fecha anterior: {new Date(showDetailsModal.rescheduledFrom).toLocaleString('es-ES')}
                      </p>
                    )}
                    {showDetailsModal.rescheduleReason && (
                      <p className="text-sm text-orange-700 mt-1">
                        Motivo: {showDetailsModal.rescheduleReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Cancellation Info */}
                {showDetailsModal.status === 'CANCELLED' && (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
                      <NoSymbolIcon className="h-4 w-4" />
                      Información de Cancelación
                    </h3>
                    {showDetailsModal.cancelledAt && (
                      <p className="text-sm text-gray-700">
                        Cancelada el: {new Date(showDetailsModal.cancelledAt).toLocaleString('es-ES')}
                      </p>
                    )}
                    {showDetailsModal.cancellationReason && (
                      <p className="text-sm text-gray-700 mt-1">
                        Motivo: {showDetailsModal.cancellationReason}
                      </p>
                    )}
                  </div>
                )}

                {/* No proof message for non-delivered */}
                {showDetailsModal.status !== 'DELIVERED' && showDetailsModal.status !== 'CANCELLED' && (
                  <div className="text-center py-8 text-gray-500">
                    <PhotoIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Las fotos, firma y ubicación estarán disponibles cuando se complete la entrega.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowRescheduleModal(null)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Reagendar Entrega
              </h2>
              <p className="text-gray-600 mb-4">
                Entrega <strong>{showRescheduleModal.trackingCode}</strong> para{' '}
                <strong>{showRescheduleModal.customer.name}</strong>
              </p>
              {showRescheduleModal.rescheduledCount && showRescheduleModal.rescheduledCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    Esta entrega ya ha sido reagendada <strong>{showRescheduleModal.rescheduledCount}</strong> vez/veces
                  </p>
                  {showRescheduleModal.rescheduleReason && (
                    <p className="text-sm text-yellow-700 mt-1">
                      Último motivo: {showRescheduleModal.rescheduleReason}
                    </p>
                  )}
                </div>
              )}
              <form onSubmit={handleReschedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva fecha de entrega *
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledDate"
                    required
                    defaultValue={showRescheduleModal.scheduledDate 
                      ? new Date(showRescheduleModal.scheduledDate).toISOString().slice(0, 16)
                      : ''}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo del reagendamiento (opcional)
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="Ej: Cliente no disponible, dirección incorrecta, etc."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRescheduleModal(null)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Reagendar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={() => setShowCancelModal(null)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Cancelar Entrega
              </h2>
              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas cancelar la entrega{' '}
                <strong>{showCancelModal.trackingCode}</strong> para{' '}
                <strong>{showCancelModal.customer.name}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Advertencia:</strong> Esta acción no se puede deshacer. 
                  La entrega será marcada como cancelada y el mensajero será desasignado.
                </p>
              </div>
              <form onSubmit={handleCancel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo de cancelación *
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    required
                    minLength={3}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    placeholder="Ej: Cliente solicitó cancelación, producto dañado, dirección inexistente, etc."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(null)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirmar Cancelación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50"
              onClick={handleCloseImportModal}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Importar Entregas desde Excel
                </h2>
                <button
                  onClick={handleCloseImportModal}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {!importResult ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="excel-file"
                    />
                    <label
                      htmlFor="excel-file"
                      className="cursor-pointer"
                    >
                      {importFile ? (
                        <div>
                          <p className="text-gray-900 font-medium">{importFile.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Clic para cambiar archivo
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-gray-600">
                            Arrastra un archivo Excel aquí o{' '}
                            <span className="text-primary-600 font-medium">haz clic para seleccionar</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Formatos: XLSX, XLS, CSV
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 py-2"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Descargar plantilla de ejemplo
                  </button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Columnas requeridas:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>nombre</strong> - Nombre del cliente</li>
                      <li>• <strong>telefono</strong> - Teléfono del cliente</li>
                      <li>• <strong>direccion</strong> - Dirección de entrega</li>
                    </ul>
                    <h4 className="text-sm font-medium text-blue-800 mt-3 mb-2">Columnas opcionales:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• email, latitud, longitud, notas</li>
                      <li>• descripcion, detalles_paquete, prioridad</li>
                      <li>• mensajero (nombre para asignar)</li>
                    </ul>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseImportModal}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!importFile || importLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {importLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="h-5 w-5" />
                          Importar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${importResult.errors.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                    <h3 className={`font-medium ${importResult.errors.length > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                      Importación completada
                    </h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-gray-700">
                        <strong>{importResult.deliveriesCreated}</strong> entregas creadas
                      </p>
                      <p className="text-gray-700">
                        <strong>{importResult.customersCreated}</strong> clientes nuevos creados
                      </p>
                      <p className="text-gray-700">
                        <strong>{importResult.totalRows}</strong> filas procesadas
                      </p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">
                        Errores ({importResult.errors.length}):
                      </h4>
                      <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                        {importResult.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={handleCloseImportModal}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Products Modal */}
      <DeliveryProductsModal
        delivery={showProductsModal}
        isOpen={!!showProductsModal}
        onClose={() => setShowProductsModal(null)}
        onUpdate={() => fetchData()}
      />
    </div>
  );
}
