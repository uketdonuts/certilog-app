'use client';

import { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UserCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

type AttendanceType = 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  type: AttendanceType;
  minutesLate: number | null;
  reason: string | null;
}

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface UserStatsPanelProps {
  user: User | null;
  records: AttendanceRecord[];
  currentDate: Date;
}

const typeConfig = {
  ATTENDANCE: {
    label: 'Asistencias',
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    barColor: 'bg-emerald-500',
  },
  TARDY: {
    label: 'Tardanzas',
    icon: ClockIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    barColor: 'bg-amber-500',
  },
  ABSENCE: {
    label: 'Ausencias Injust.',
    icon: XCircleIcon,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    barColor: 'bg-rose-500',
  },
  VACATION: {
    label: 'Vacaciones',
    icon: CalendarIcon,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    barColor: 'bg-sky-500',
  },
  DISABILITY: {
    label: 'Incapacidades',
    icon: ExclamationTriangleIcon,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    barColor: 'bg-violet-500',
  },
  OVERTIME: {
    label: 'Horas Extras',
    icon: SparklesIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    barColor: 'bg-purple-500',
  },
};

export default function UserStatsPanel({ user, records, currentDate }: UserStatsPanelProps) {
  const stats = useMemo(() => {
    if (!user) return null;

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Filter records for this user in current month
    const userMonthRecords = records.filter(r => {
      const recordDate = parseISO(r.date);
      return r.userId === user.id && isSameMonth(recordDate, currentDate);
    });

    // Count by type
    const counts = {
      ATTENDANCE: userMonthRecords.filter(r => r.type === 'ATTENDANCE').length,
      TARDY: userMonthRecords.filter(r => r.type === 'TARDY').length,
      ABSENCE: userMonthRecords.filter(r => r.type === 'ABSENCE').length,
      VACATION: userMonthRecords.filter(r => r.type === 'VACATION').length,
      DISABILITY: userMonthRecords.filter(r => r.type === 'DISABILITY').length,
      OVERTIME: userMonthRecords.filter(r => r.type === 'OVERTIME').length,
    };

    const totalRecords = userMonthRecords.length;
    const workingDays = daysInMonth.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length;
    
    // Calculate attendance rate (present + tardy) / working days
    const presentDays = counts.ATTENDANCE + counts.TARDY;
    const attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

    // Total minutes late
    const totalMinutesLate = userMonthRecords
      .filter(r => r.type === 'TARDY' && r.minutesLate)
      .reduce((sum, r) => sum + (r.minutesLate || 0), 0);

    return {
      counts,
      totalRecords,
      workingDays,
      attendanceRate,
      totalMinutesLate,
      daysWithRecords: new Set(userMonthRecords.map(r => format(parseISO(r.date), 'yyyy-MM-dd'))).size,
    };
  }, [user, records, currentDate]);

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="text-center py-8">
          <UserCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Selecciona un empleado</p>
          <p className="text-sm text-gray-400 mt-1">
            Filtra por persona para ver sus estadísticas
          </p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const StatRow = ({ type, count }: { type: AttendanceType; count: number }) => {
    const config = typeConfig[type];
    const Icon = config.icon;
    const percentage = stats.totalRecords > 0 ? Math.round((count / stats.totalRecords) * 100) : 0;

    return (
      <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-3 transition-all hover:shadow-md`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-white/60 ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">{config.label}</span>
          </div>
          <span className={`text-lg font-bold ${config.color}`}>{count}</span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.barColor} rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(percentage, 5)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentage}% del mes</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* User Header */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl border border-primary-100 p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-xl font-bold text-primary-600">
              {user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{user.fullName}</h3>
            <p className="text-sm text-gray-500 uppercase">{user.role}</p>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.attendanceRate}%</p>
            <p className="text-xs text-gray-600">Asistencia del mes</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.daysWithRecords}</p>
            <p className="text-xs text-gray-600">Días registrados</p>
          </div>
        </div>

        {stats.totalMinutesLate > 0 && (
          <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-sm text-amber-700 text-center">
              <span className="font-semibold">{stats.totalMinutesLate} minutos</span> de retraso acumulados
            </p>
          </div>
        )}
      </div>

      {/* Breakdown by Type */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-gray-500" />
          Desglose del Mes
        </h4>
        
        <div className="space-y-3">
          <StatRow type="ATTENDANCE" count={stats.counts.ATTENDANCE} />
          <StatRow type="TARDY" count={stats.counts.TARDY} />
          <StatRow type="VACATION" count={stats.counts.VACATION} />
          <StatRow type="DISABILITY" count={stats.counts.DISABILITY} />
          <StatRow type="ABSENCE" count={stats.counts.ABSENCE} />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600 text-center">
          <span className="font-semibold">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
          <br />
          <span className="text-gray-500">
            {stats.workingDays} días laborales • {stats.totalRecords} registros
          </span>
        </p>
      </div>
    </div>
  );
}
