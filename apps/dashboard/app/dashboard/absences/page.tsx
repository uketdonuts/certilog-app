'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  UsersIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  ChartBarIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  StatCard,
  AttendanceCalendar,
  DayDetailPanel,
  TeamView,
  HelpModal,
  UserStatsPanel,
} from '@/components/attendance';
import {
  getAttendanceRecords,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getUsers,
} from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { confirmAction } from '@/components/confirm';
import Pagination from '@/components/Pagination';

type AttendanceType = 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';
type ViewMode = 'team' | 'calendar' | 'list';

export interface User {
  id: string;
  fullName: string;
  username: string | null;
  role: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  user?: User;
  date: string;
  type: AttendanceType;
  minutesLate: number | null;
  reason: string | null;
  reportedBy: string | null;
  reporter?: User | null;
  status: string | null;
  createdAt: string;
}

const TYPE_CONFIG: Record<AttendanceType, { label: string; bgColor: string; textColor: string; icon: typeof CheckCircleIcon }> = {
  ATTENDANCE: {
    label: 'Asistencia',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    icon: CheckCircleIcon,
  },
  ABSENCE: {
    label: 'Ausencia Injustificada',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-800',
    icon: XCircleIcon,
  },
  VACATION: {
    label: 'Vacaciones',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-800',
    icon: CalendarDaysIcon,
  },
  DISABILITY: {
    label: 'Incapacidad',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
    icon: ExclamationTriangleIcon,
  },
  TARDY: {
    label: 'Tardanza',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    icon: ClockIcon,
  },
  OVERTIME: {
    label: 'Horas Extras',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: SparklesIcon,
  },
};

export default function AttendancePage() {
  // Data state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('team');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayRecords, setSelectedDayRecords] = useState<AttendanceRecord[]>([]);
  const [showDayPanel, setShowDayPanel] = useState(false);
  
  // List view state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  
  // Calendar filter state
  const [calendarSelectedUserId, setCalendarSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    type: 'ATTENDANCE' as AttendanceType,
    date: '',
    minutesLate: '',
    reason: '',
  });

  const toast = useToast();

  // Load data
  useEffect(() => {
    fetchUsers();
    fetchRecords();
  }, [page]);

  async function fetchUsers() {
    try {
      const data = await getUsers({ limit: 100 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setUsers(list);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function fetchRecords() {
    try {
      setIsLoading(true);
      const data = await getAttendanceRecords({ page, limit: 100 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setRecords(list);
      setTotalPages(data?.totalPages || 1);
      setTotalItems(data?.total || list.length);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.push({ type: 'error', message: 'Error cargando registros' });
    } finally {
      setIsLoading(false);
    }
  }

  // Stats calculation
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = records.filter(r => format(parseISO(r.date), 'yyyy-MM-dd') === today);
    
    const teamMembers = users.filter(u => u.role === 'COURIER' || u.role === 'HELPER');
    
    return {
      present: todayRecords.filter(r => r.type === 'ATTENDANCE').length,
      tardy: todayRecords.filter(r => r.type === 'TARDY').length,
      absent: todayRecords.filter(r => r.type === 'ABSENCE').length,
      vacation: todayRecords.filter(r => r.type === 'VACATION').length,
      total: teamMembers.length,
      attendanceRate: teamMembers.length > 0 
        ? Math.round(((todayRecords.filter(r => r.type === 'ATTENDANCE').length + todayRecords.filter(r => r.type === 'TARDY').length) / teamMembers.length) * 100)
        : 0,
    };
  }, [records, users]);

  // Handlers
  async function handleMarkAttendance(userId: string, type: AttendanceType, minutesLate?: number, note?: string, file?: File | null) {
    try {
      // Check if record already exists for this user and date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const existingRecord = records.find(r => 
        r.userId === userId && format(parseISO(r.date), 'yyyy-MM-dd') === dateStr
      );

      let attachmentUrl = undefined;
      let attachmentName = undefined;

      // Upload file if provided
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/attendance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          attachmentUrl = result.data.url;
          attachmentName = file.name;
        }
      }

      const payload = {
        userId,
        type,
        date: selectedDate.toISOString(),
        minutesLate: (type === 'TARDY' || type === 'OVERTIME') ? minutesLate : undefined,
        reason: note,
        attachmentUrl,
        attachmentName,
      };

      if (existingRecord) {
        await updateAttendanceRecord(existingRecord.id, payload);
        toast.push({ type: 'success', message: 'Registro actualizado' });
      } else {
        await createAttendanceRecord(payload);
        toast.push({ type: 'success', message: 'Asistencia registrada' });
      }
      fetchRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.push({ type: 'error', message: 'Error al registrar asistencia' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirmAction('¿Eliminar este registro?')) return;
    try {
      await deleteAttendanceRecord(id);
      toast.push({ type: 'success', message: 'Registro eliminado' });
      fetchRecords();
      if (showDayPanel) {
        setSelectedDayRecords(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      toast.push({ type: 'error', message: 'Error al eliminar' });
    }
  }

  function openEditModal(record: AttendanceRecord) {
    setEditingRecord(record);
    const date = record.date ? new Date(record.date) : new Date();
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormData({
      userId: record.userId,
      type: record.type,
      date: localDateTime,
      minutesLate: record.minutesLate?.toString() || '',
      reason: record.reason || '',
    });
    setShowModal(true);
    setShowDayPanel(false);
  }

  function openNewModal() {
    setEditingRecord(null);
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormData({
      userId: '',
      type: 'ATTENDANCE',
      date: localDateTime,
      minutesLate: '',
      reason: '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        userId: formData.userId,
        type: formData.type,
        date: new Date(formData.date).toISOString(),
        minutesLate: (formData.type === 'TARDY' || formData.type === 'OVERTIME') && formData.minutesLate ? parseInt(formData.minutesLate) : undefined,
        reason: formData.reason || undefined,
      };

      if (editingRecord) {
        await updateAttendanceRecord(editingRecord.id, payload);
        toast.push({ type: 'success', message: 'Registro actualizado' });
      } else {
        await createAttendanceRecord(payload);
        toast.push({ type: 'success', message: 'Registro creado' });
      }
      setShowModal(false);
      fetchRecords();
    } catch (error) {
      console.error('Error saving attendance record:', error);
      toast.push({ type: 'error', message: 'Error al guardar el registro' });
    }
  }

  function handleSelectDay(date: Date, dayRecords: AttendanceRecord[]) {
    setSelectedDayRecords(dayRecords);
    setShowDayPanel(true);
  }

  // Filtered records for list view
  const filteredRecords = records.filter(r => {
    const matchesSearch = search
      ? (r.user?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.reason || '').toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesType = filterType ? r.type === filterType : true;
    return matchesSearch && matchesType;
  });

  // Render helpers
  const TabButton = ({ mode, icon: Icon, label }: { mode: ViewMode; icon: any; label: string }) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
        viewMode === mode
          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona la asistencia de tu equipo de forma rápida y visual
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl hover:bg-primary-700 transition shadow-md shadow-primary-600/20"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Registro
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Presentes Hoy"
            value={`${stats.present}/${stats.total}`}
            subtitle="Empleados en turno"
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="green"
          />
          <StatCard
            title="Tardanzas"
            value={stats.tardy}
            subtitle="Llegadas tarde hoy"
            icon={<ClockIcon className="h-6 w-6" />}
            color="yellow"
          />
          <StatCard
            title="Aus. Injustificadas"
            value={stats.absent}
            subtitle="Faltas sin justificar"
            icon={<XCircleIcon className="h-6 w-6" />}
            color="red"
          />
          <StatCard
            title="Vacaciones"
            value={stats.vacation}
            subtitle="Días de descanso"
            icon={<CalendarDaysIcon className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Tasa de Asistencia"
            value={`${stats.attendanceRate}%`}
            subtitle="Del equipo total"
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="purple"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl w-fit">
          <TabButton mode="team" icon={UsersIcon} label="Equipo" />
          <TabButton mode="calendar" icon={CalendarDaysIcon} label="Calendario" />
          <TabButton mode="list" icon={ListBulletIcon} label="Historial" />
        </div>
        
        {/* Help Button */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl font-medium transition-all duration-200 border border-primary-200"
          title="Ver guía de colores y significados"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
          <span>Ayuda</span>
        </button>
      </div>

      {/* Views */}
      {viewMode === 'team' && (
        <TeamView
          users={users}
          records={records}
          selectedDate={selectedDate}
          onMarkAttendance={handleMarkAttendance}
          onEditRecord={openEditModal}
        />
      )}

      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* User Filter for Calendar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Filtrar por empleado:
                </label>
                <select
                  value={calendarSelectedUserId || ''}
                  onChange={(e) => setCalendarSelectedUserId(e.target.value || null)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Todos los empleados</option>
                  {users
                    .filter(u => u.role === 'COURIER' || u.role === 'HELPER')
                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role})
                      </option>
                    ))}
                </select>
                {calendarSelectedUserId && (
                  <button
                    onClick={() => setCalendarSelectedUserId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <AttendanceCalendar
              currentDate={selectedDate}
              onDateChange={setSelectedDate}
              records={records}
              users={users}
              selectedUserId={calendarSelectedUserId}
              onSelectDay={handleSelectDay}
            />
          </div>
          <div className="space-y-4">
            {/* User Stats Panel */}
            <UserStatsPanel
              user={calendarSelectedUserId ? users.find(u => u.id === calendarSelectedUserId) || null : null}
              records={records}
              currentDate={selectedDate}
            />

            {/* Legend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Leyenda</h3>
              <div className="space-y-3">
                {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${config.textColor}`} />
                      </div>
                      <span className="text-sm text-gray-600">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empleado o razón..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos los tipos</option>
              <option value="ATTENDANCE">Asistencias</option>
              <option value="ABSENCE">Ausencias Injustificadas</option>
              <option value="VACATION">Vacaciones</option>
              <option value="DISABILITY">Incapacidades</option>
              <option value="TARDY">Tardanzas</option>
              <option value="OVERTIME">Horas Extras</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => {
                    const typeConfig = TYPE_CONFIG[record.type];
                    const IconComponent = typeConfig.icon;
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeConfig.bgColor}`}>
                              <IconComponent className={`h-5 w-5 ${typeConfig.textColor}`} />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {record.user?.fullName || 'Desconocido'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.user?.role || ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${typeConfig.bgColor} ${typeConfig.textColor}`}>
                            <IconComponent className="h-3.5 w-3.5" />
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {format(parseISO(record.date), 'dd MMM yyyy', { locale: es })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.type === 'TARDY' && record.minutesLate ? (
                            <span className="text-amber-600 font-medium">{record.minutesLate} min tarde</span>
                          ) : record.reason ? (
                            <span className="line-clamp-1 max-w-xs">{record.reason}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(record)}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                              title="Editar"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
            </div>

            {filteredRecords.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ListBulletIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No se encontraron registros</p>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Day Detail Panel */}
      {showDayPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowDayPanel(false)}
          />
          <DayDetailPanel
            date={selectedDate}
            records={selectedDayRecords.map(r => ({
              ...r,
              user: users.find(u => u.id === r.userId),
            }))}
            onClose={() => setShowDayPanel(false)}
            onDelete={handleDelete}
            onEdit={openEditModal}
          />
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {editingRecord ? 'Editar Registro' : 'Nuevo Registro de Asistencia'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingRecord && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Empleado *
                    </label>
                    <select
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar empleado...</option>
                      {users
                        .filter(u => u.role === 'COURIER' || u.role === 'HELPER')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as AttendanceType })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="ATTENDANCE">Asistencia</option>
                      <option value="ABSENCE">Ausencia Injustificada</option>
                      <option value="VACATION">Vacaciones</option>
                      <option value="DISABILITY">Incapacidad</option>
                      <option value="TARDY">Tardanza</option>
                      <option value="OVERTIME">Horas Extras</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha y Hora *</label>
                    <input
                      type="datetime-local"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {(formData.type === 'TARDY' || formData.type === 'OVERTIME') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {formData.type === 'OVERTIME' ? 'Minutos Extras' : 'Minutos de Retraso'}
                    </label>
                    <input
                      type="number"
                      value={formData.minutesLate}
                      onChange={(e) => setFormData({ ...formData, minutesLate: e.target.value })}
                      placeholder={formData.type === 'OVERTIME' ? "60" : "15"}
                      min="0"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nota / Razón
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    placeholder="Motivo o notas adicionales..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium transition shadow-md shadow-primary-600/20"
                  >
                    {editingRecord ? 'Guardar Cambios' : 'Crear Registro'}
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
