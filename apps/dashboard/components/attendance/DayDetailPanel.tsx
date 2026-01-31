'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  UserCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type AttendanceType = 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DayDetailPanelProps {
  date: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  records: any[];
  onClose: () => void;
  onDelete: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit: (record: any) => void;
}

const typeConfig = {
  ATTENDANCE: {
    label: 'Presente',
    icon: CheckCircleIcon,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  TARDY: {
    label: 'Tardanza',
    icon: ClockIcon,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  ABSENCE: {
    label: 'Ausente (Injust.)',
    icon: XCircleIcon,
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    iconColor: 'text-rose-500',
  },
  VACATION: {
    label: 'Vacaciones',
    icon: CalendarIcon,
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    iconColor: 'text-sky-500',
  },
  DISABILITY: {
    label: 'Incapacidad',
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    iconColor: 'text-violet-500',
  },
  OVERTIME: {
    label: 'Horas Extras',
    icon: SparklesIcon,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-500',
  },
};

export default function DayDetailPanel({ date, records, onClose, onDelete, onEdit }: DayDetailPanelProps) {
  const formattedDate = format(date, "EEEE d 'de' MMMM", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-out animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">{capitalizedDate}</h3>
          <p className="text-sm text-gray-500">
            {records.length} {records.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Records List */}
      <div className="overflow-y-auto h-[calc(100vh-80px)] p-4 space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No hay registros para este día</p>
            <p className="text-sm text-gray-400 mt-1">
              Haz clic en el calendario para agregar registros
            </p>
          </div>
        ) : (
          records.map((record) => {
            const config = typeConfig[record.type as AttendanceType];
            const Icon = config.icon;

            return (
              <div
                key={record.id}
                className={`${config.bgColor} rounded-xl p-4 border border-opacity-20`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/60 ${config.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {record.user?.fullName || 'Empleado'}
                      </p>
                      <p className="text-xs text-gray-500 uppercase">
                        {record.user?.role || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(record)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(record.id)}
                      className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${config.textColor}`}>
                      {config.label}
                    </span>
                    {record.type === 'TARDY' && record.minutesLate && (
                      <span className="text-sm text-amber-600">
                        ({record.minutesLate} min)
                      </span>
                    )}
                  </div>

                  {record.reason && (
                    <p className="text-sm text-gray-600 bg-white/40 rounded-lg px-3 py-2 mt-2">
                      &ldquo;{record.reason}&rdquo;
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    {format(parseISO(record.date), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
