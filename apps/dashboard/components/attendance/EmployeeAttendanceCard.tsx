'use client';

import { useState, useRef } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import QuickActionMenu from './QuickActionMenu';

type AttendanceType = 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';

interface EmployeeAttendanceCardProps {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
  status: AttendanceType | null;
  checkInTime?: string | null;
  minutesLate?: number | null;
  note?: string | null;
  onMarkAttendance: (type: AttendanceType, minutesLate?: number, note?: string, file?: File | null) => void;
  onEdit?: () => void;
}

const statusConfig = {
  ATTENDANCE: {
    label: 'Presente',
    icon: CheckCircleIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  TARDY: {
    label: 'Tardanza',
    icon: ClockIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  ABSENCE: {
    label: 'Ausente (Injust.)',
    icon: XCircleIcon,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badgeColor: 'bg-rose-100 text-rose-700',
  },
  VACATION: {
    label: 'Vacaciones',
    icon: CalendarIcon,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    badgeColor: 'bg-sky-100 text-sky-700',
  },
  DISABILITY: {
    label: 'Incapacidad',
    icon: ExclamationTriangleIcon,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    badgeColor: 'bg-violet-100 text-violet-700',
  },
  OVERTIME: {
    label: 'Horas Extras',
    icon: SparklesIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  UNMARKED: {
    label: 'Sin marcar',
    icon: QuestionMarkCircleIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    badgeColor: 'bg-gray-100 text-gray-500',
  },
};

export default function EmployeeAttendanceCard({
  id,
  name,
  role,
  avatar,
  status,
  checkInTime,
  minutesLate,
  note,
  onMarkAttendance,
  onEdit,
}: EmployeeAttendanceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const config = status ? statusConfig[status] : statusConfig.UNMARKED;
  const Icon = config.icon;

  const handleMark = (type: AttendanceType, minutesLate?: number, note?: string, file?: File | null) => {
    onMarkAttendance(type, minutesLate, note, file);
    setMenuOpen(false);
  };

  // Get initials for avatar fallback
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => setMenuOpen(true)}
        className={`relative group cursor-pointer rounded-2xl border-2 ${config.borderColor} ${config.bgColor} p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1`}
      >
        {/* Status Badge */}
        <div className="absolute -top-3 left-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.badgeColor} shadow-sm`}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>
        </div>

        {/* Main Content */}
        <div className="pt-3">
          {/* Avatar and Name */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                  <span className={`text-lg font-bold ${config.color}`}>
                    {initials}
                  </span>
                </div>
              )}
              {/* Status indicator dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                status === 'ATTENDANCE' ? 'bg-emerald-500' :
                status === 'TARDY' ? 'bg-amber-500' :
                status === 'ABSENCE' ? 'bg-rose-500' :
                status === 'VACATION' ? 'bg-sky-500' :
                status === 'DISABILITY' ? 'bg-violet-500' :
                status === 'OVERTIME' ? 'bg-purple-500' :
                'bg-gray-300'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{role}</p>
            </div>
          </div>

          {/* Status Details */}
          <div className="space-y-2">
            {status === 'ATTENDANCE' && checkInTime && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 text-emerald-500" />
                <span>Entrada: <span className="font-medium">{checkInTime}</span></span>
              </div>
            )}
            
            {status === 'TARDY' && (
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="h-4 w-4 text-amber-500" />
                <span className="text-gray-600">
                  Retraso: <span className="font-medium text-amber-600">{minutesLate || '?'} min</span>
                </span>
              </div>
            )}

            {note && (
              <div className="text-xs text-gray-500 bg-white/60 rounded-lg px-2 py-1.5 line-clamp-2">
                &ldquo;{note}&rdquo;
              </div>
            )}

            {!status && (
              <div className="flex items-center justify-center py-3">
                <span className="text-sm text-gray-400 font-medium">
                  Click para marcar
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hover overlay hint */}
        <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none" />
      </div>

      <QuickActionMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={cardRef as React.RefObject<HTMLElement>}
        currentType={status}
        onSelect={handleMark}
        onEdit={onEdit}
      />
    </>
  );
}
