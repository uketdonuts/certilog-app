'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { getUsers, createUser, updateUser, deactivateUser, deleteUserPermanently } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

interface User {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  phone: string | null;
  role: 'ADMIN' | 'DISPATCHER' | 'COURIER' | 'HELPER';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    pin: '',
    phone: '',
    role: 'COURIER' as User['role'],
  });

  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, [page]);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      const data = await getUsers({ page, limit: 20 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setUsers(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.push({ type: 'error', message: 'Error cargando usuarios' });
    } finally {
      setIsLoading(false);
    }
  }

  function openNewModal() {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      username: '',
      password: '',
      pin: '',
      phone: '',
      role: 'COURIER',
    });
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email || '',
      username: user.username || '',
      password: '',
      pin: '',
      phone: user.phone || '',
      role: user.role,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          fullName: formData.fullName,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          role: formData.role,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await updateUser(editingUser.id, payload);
        toast.push({ type: 'success', message: 'Usuario actualizado' });
      } else {
        await createUser({
          fullName: formData.fullName,
          email: formData.email || undefined,
          username: formData.username || undefined,
          password: formData.password || undefined,
          pin: formData.pin || undefined,
          phone: formData.phone || undefined,
          role: formData.role,
        });
        toast.push({ type: 'success', message: 'Usuario creado' });
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.push({ type: 'error', message: 'Error al guardar el usuario' });
    }
  }

  async function handleDeactivate(user: User) {
    if (!confirmAction(`¿Desactivar a ${user.fullName}?`)) {
      return;
    }

    try {
      await deactivateUser(user.id);
      toast.push({ type: 'success', message: 'Usuario desactivado' });
      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.push({ type: 'error', message: 'Error al desactivar el usuario' });
    }
  }

  async function handleDelete(user: User) {
    if (!confirmAction(`¿Eliminar permanentemente a ${user.fullName}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await deleteUserPermanently(user.id);
      toast.push({ type: 'success', message: 'Usuario eliminado' });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.push({ type: 'error', message: 'Error al eliminar el usuario' });
    }
  }

  function getRoleLabel(role: User['role']) {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'DISPATCHER':
        return 'Despachador';
      case 'COURIER':
        return 'Mensajero';
      case 'HELPER':
        return 'Ayudante';
      default:
        return role;
    }
  }

  function getRoleColor(role: User['role']) {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'DISPATCHER':
        return 'bg-blue-100 text-blue-800';
      case 'COURIER':
        return 'bg-green-100 text-green-800';
      case 'HELPER':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = search
      ? user.fullName.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.username?.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesRole = filterRole ? user.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los roles</option>
          <option value="ADMIN">Administrador</option>
          <option value="DISPATCHER">Despachador</option>
          <option value="COURIER">Mensajero</option>
          <option value="HELPER">Ayudante</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={`hover:bg-gray-50 ${!user.isActive ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.isActive ? 'bg-primary-100' : 'bg-gray-200'
                    }`}>
                      <UserIcon className={`h-5 w-5 ${user.isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.fullName}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{user.username || '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email || '-'}</div>
                  <div className="text-sm text-gray-500">{user.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <a
                      href={`/dashboard/users/${user.id}`}
                      className="p-2 text-gray-400 hover:text-primary-600 transition"
                      title="Ver detalles"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition"
                      title="Editar"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    {user.isActive && (
                      <button
                        onClick={() => handleDeactivate(user)}
                        className="p-2 text-gray-400 hover:text-yellow-600 transition"
                        title="Desactivar"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(user)}
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

        {filteredUsers.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron usuarios
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
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    placeholder="Juan Pérez"
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="correo@ejemplo.com"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+507 6000-0000"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {!editingUser && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Usuario
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="jperez"
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIN (4 dígitos)
                      </label>
                      <input
                        type="text"
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="1234"
                        maxLength={4}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser ? 'Nueva Contraseña' : 'Contraseña'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Dejar vacío para no cambiar' : '••••••••'}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                      required
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="COURIER">Mensajero</option>
                      <option value="HELPER">Ayudante</option>
                      <option value="DISPATCHER">Despachador</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
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
                    {editingUser ? 'Guardar' : 'Crear'}
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
