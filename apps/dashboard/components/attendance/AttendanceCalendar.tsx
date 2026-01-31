'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AttendanceCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  records: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any[];
  selectedUserId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectDay: (date: Date, dayRecords: any[]) => void;
}

const typeConfig = {
  ATTENDANCE: { color: 'bg-emerald-500', icon: CheckCircleIcon, label: 'Asistencia' },
  TARDY: { color: 'bg-amber-500', icon: ClockIcon, label: 'Tardanza' },
  ABSENCE: { color: 'bg-rose-500', icon: XCircleIcon, label: 'Ausencia Injust.' },
  VACATION: { color: 'bg-sky-500', icon: CalendarIcon, label: 'Vacaciones' },
  DISABILITY: { color: 'bg-violet-500', icon: ExclamationTriangleIcon, label: 'Incapacidad' },
  OVERTIME: { color: 'bg-purple-500', icon: SparklesIcon, label: 'Horas Extras' },
};

export default function AttendanceCalendar({
  currentDate,
  onDateChange,
  records,
  users,
  selectedUserId,
  onSelectDay,
}: AttendanceCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDayRecords = (date: Date): any[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return records.filter(r => {
      const recordDate = format(parseISO(r.date), 'yyyy-MM-dd');
      const matchesDate = recordDate === dateStr;
      const matchesUser = selectedUserId ? r.userId === selectedUserId : true;
      return matchesDate && matchesUser;
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDaySummary = (dayRecords: any[]) => {
    const summary: Record<AttendanceType, number> = {
      ATTENDANCE: 0,
      TARDY: 0,
      ABSENCE: 0,
      VACATION: 0,
      DISABILITY: 0,
      OVERTIME: 0,
    };
    dayRecords.forEach(r => {
      const type = r.type as AttendanceType;
      if (summary[type] !== undefined) {
        summary[type] = (summary[type] || 0) + 1;
      }
    });
    return summary;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDateChange(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => onDateChange(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-gray-50/50">
        {weekDays.map((weekDay) => (
          <div
            key={weekDay}
            className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            {weekDay}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, new Date());
          const dayRecords = getDayRecords(date);
          const summary = getDaySummary(dayRecords);
          const hasRecords = dayRecords.length > 0;

          return (
            <div
              key={date.toISOString()}
              onClick={() => onSelectDay(date, dayRecords)}
              onMouseEnter={() => setHoveredDay(date)}
              onMouseLeave={() => setHoveredDay(null)}
              className={`
                min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer
                transition-all duration-200
                ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-400' : 'bg-white'}
                ${isToday ? 'bg-blue-50/30' : ''}
                ${hoveredDay && isSameDay(hoveredDay, date) ? 'bg-gray-50' : ''}
                hover:bg-gray-50
              `}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}
                  `}
                >
                  {format(date, 'd')}
                </span>
                {hasRecords && (
                  <span className="text-xs text-gray-400">
                    {dayRecords.length}
                  </span>
                )}
              </div>

              {/* Day Records Summary */}
              <div className="space-y-1">
                {Object.entries(summary)
                  .filter(([_, count]) => count > 0)
                  .slice(0, 3)
                  .map(([type, count]) => {
                    const config = typeConfig[type as AttendanceType];
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-1.5"
                      >
                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                        <span className="text-xs text-gray-600">
                          {count} {count === 1 ? 'registro' : 'registros'}
                        </span>
                      </div>
                    );
                  })}
                {Object.values(summary).reduce((a, b) => a + b, 0) > 3 && (
                  <span className="text-xs text-gray-400">
                    +{Object.values(summary).reduce((a, b) => a + b, 0) - 3} más
                  </span>
                )}
              </div>

              {/* User avatars if filtered by user */}
              {selectedUserId && hasRecords && (
                <div className="mt-2 flex -space-x-1">
                  {dayRecords.slice(0, 3).map((record) => {
                    const user = users.find(u => u.id === record.userId);
                    return (
                      <div
                        key={record.id}
                        className={`w-5 h-5 rounded-full ${typeConfig[record.type as AttendanceType].color} border border-white flex items-center justify-center`}
                        title={user?.fullName}
                      >
                        <span className="text-[8px] text-white font-bold">
                          {user?.fullName.charAt(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
