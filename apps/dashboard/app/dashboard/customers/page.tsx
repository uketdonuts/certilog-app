'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getCustomers, createCustomer, updateCustomer, deactivateCustomer, deleteCustomerPermanently } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  isActive: boolean;
  _count: { deliveries: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const toast = useToast();

  async function fetchCustomers() {
    try {
      const data = await getCustomers({ search, page, limit: 20 });
      // API returns { data: customers[], total, page, limit, totalPages }
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setCustomers(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function openNewModal() {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setShowModal(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address,
      notes: customer.notes || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address,
          notes: formData.notes || undefined,
        });
      } else {
        await createCustomer({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          address: formData.address,
          notes: formData.notes || undefined,
        });
      }
      setShowModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.push({ type: 'error', message: 'Error al guardar el cliente' });
    }
  }

  async function handleDeactivate(customer: Customer) {
    if (!confirmAction(`¿Desactivar a ${customer.name}? El cliente no aparecerá en nuevas entregas.`)) {
      return;
    }

    try {
      await deactivateCustomer(customer.id);
      fetchCustomers();
    } catch (error) {
      console.error('Error deactivating customer:', error);
      toast.push({ type: 'error', message: 'Error al desactivar el cliente' });
    }
  }

  async function handleDelete(customer: Customer) {
    if (customer._count.deliveries > 0) {
      toast.push({ type: 'error', message: 'No se puede eliminar permanentemente un cliente con entregas asociadas. Puede desactivarlo en su lugar.' });
      return;
    }

    if (!confirmAction(`¿Eliminar permanentemente a ${customer.name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteCustomerPermanently(customer.id);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el cliente' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o dirección..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition ${customer.isActive === false ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${customer.isActive === false ? 'bg-gray-200' : 'bg-primary-100'} rounded-full flex items-center justify-center`}>
                  <span className={`${customer.isActive === false ? 'text-gray-500' : 'text-primary-600'} font-semibold text-lg`}>
                    {customer.name.charAt(0)}
                  </span>
                </div>
                {customer.isActive === false && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    Inactivo
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(customer)}
                  className="p-2 text-gray-400 hover:text-primary-600 transition"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                {customer.isActive !== false && (
                  <button
                    onClick={() => handleDeactivate(customer)}
                    className="p-2 text-gray-400 hover:text-yellow-600 transition"
                    title="Desactivar cliente"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(customer)}
                  className="p-2 text-gray-400 hover:text-red-600 transition"
                  disabled={customer._count.deliveries > 0}
                  title={customer._count.deliveries > 0 ? 'No se puede eliminar con entregas asociadas' : 'Eliminar permanentemente'}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 text-lg mb-1">
              {customer.name}
            </h3>
            <p className="text-gray-600 mb-2">{customer.phone}</p>
            <p className="text-sm text-gray-500 mb-4">{customer.address}</p>

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-500">
                {customer._count.deliveries} entrega(s)
              </span>
              {customer.email && (
                <span className="text-sm text-gray-500">{customer.email}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron clientes
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

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
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    required
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
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
                    {editingCustomer ? 'Guardar' : 'Crear'}
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
