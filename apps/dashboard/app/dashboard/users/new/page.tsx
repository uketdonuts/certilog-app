"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/lib/api';

export default function NewUserPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('COURIER');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUser({ fullName, email: email || undefined, username: username || undefined, password: password || undefined, role });
      router.push('/dashboard/users');
    } catch (err) {
      console.error(err);
      alert('Error creando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Crear usuario</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full rounded-md border" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full rounded-md border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full rounded-md border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full rounded-md border">
            <option value="COURIER">Mensajero</option>
            <option value="DISPATCHER">Despachador</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        <div>
          <button disabled={loading} type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">{loading ? 'Creando...' : 'Crear'}</button>
        </div>
      </form>
    </div>
  );
}
