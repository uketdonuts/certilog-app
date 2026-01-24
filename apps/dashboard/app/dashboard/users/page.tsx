"use client";

import { useEffect, useState } from 'react';
import { getUsers } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getUsers({ page: 1, limit: 50 });
        const list = data.data || data;
        setUsers(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <div className="mt-3">
        <a href="/dashboard/users/new" className="inline-block px-3 py-2 bg-primary-600 text-white rounded">Crear usuario</a>
      </div>
      <div className="mt-4 bg-white rounded-xl shadow-sm divide-y">
        {users.map((u) => (
          <a key={u.id} href={`/dashboard/users/${u.id}`} className="block p-4 flex items-center justify-between hover:bg-gray-50">
            <div>
              <div className="font-medium">{u.fullName || u.username}</div>
              <div className="text-sm text-gray-500">{u.email}</div>
            </div>
            <div className="text-sm text-gray-500">{u.role}</div>
          </a>
        ))}
        {users.length === 0 && <div className="p-6 text-gray-500">No hay usuarios</div>}
      </div>
    </div>
  );
}
