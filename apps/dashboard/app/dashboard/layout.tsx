'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  HomeIcon,
  TruckIcon,
  UsersIcon,
  UserGroupIcon,
  MapIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { getStoredUser, logout } from '@/lib/api';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Entregas', href: '/dashboard/deliveries', icon: TruckIcon },
  { name: 'Clientes', href: '/dashboard/customers', icon: UsersIcon },
  { name: 'Usuarios', href: '/dashboard/users', icon: UserGroupIcon },
  { name: 'Vehículos', href: '/dashboard/vehicles', icon: TruckIcon },
  { name: 'Gasolina', href: '/dashboard/gas', icon: TruckIcon },
  { name: 'Asistencia', href: '/dashboard/absences', icon: ClockIcon },
  { name: 'Mantenimiento', href: '/dashboard/fleet-maintenance', icon: ExclamationCircleIcon },
  { name: 'Preventivo', href: '/dashboard/preventive', icon: CheckCircleIcon },
  { name: 'Reparaciones', href: '/dashboard/repairs', icon: ExclamationCircleIcon },
  { name: 'Semáforo de llantas', href: '/dashboard/tire-semaphore', icon: MapIcon },
  { name: 'Mapa', href: '/dashboard/map', icon: MapIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push('/login');
      return;
    }

    if (storedUser.role !== 'ADMIN' && storedUser.role !== 'DISPATCHER') {
      router.push('/login');
      return;
    }

    setUser(storedUser);
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-primary-600">CertiLog</h1>
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex items-center h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-primary-600">CertiLog</h1>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  pathname === item.href
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-semibold">
                  {user.fullName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.fullName}</p>
                <p className="text-sm text-gray-500">
                  {user.role === 'ADMIN' ? 'Administrador' : 'Despachador'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 w-full px-4 py-2 rounded-lg hover:bg-red-50 transition"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 lg:hidden bg-white border-b px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-primary-600">CertiLog</h1>
        </div>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
