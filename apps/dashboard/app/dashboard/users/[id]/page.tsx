"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getUserById, updateUser, deactivateUser } from '@/lib/api';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COURIER');

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getUserById(id);
        const u = data.data || data;
        setUser(u);
        setFullName(u.fullName || '');
        setEmail(u.email || '');
        setRole(u.role || 'COURIER');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [id]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser(id, { fullName, email, role });
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      alert('Error actualizando usuario');
    }
  };

  const onDeactivate = async () => {
    if (!confirm('Desactivar usuario?')) return;
    try {
      await deactivateUser(id);
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      alert('Error desactivando usuario');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Usuario no encontrado</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Editar usuario</h1>
      <form onSubmit={onSave} className="mt-4 space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full rounded-md border" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full rounded-md border">
            <option value="COURIER">Mensajero</option>
            <option value="DISPATCHER">Despachador</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Guardar</button>
          <button type="button" onClick={onDeactivate} className="px-4 py-2 bg-red-600 text-white rounded">Desactivar</button>
        </div>
      </form>
    </div>
  );
}
