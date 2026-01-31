'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import EmployeeAttendanceCard from './EmployeeAttendanceCard';

type AttendanceType = 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';

interface User {
  id: string;
  fullName: string;
  username: string | null;
  role: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TeamViewProps {
  users: User[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  records: any[];
  selectedDate: Date;
  onMarkAttendance: (userId: string, type: AttendanceType, minutesLate?: number, note?: string, file?: File | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditRecord: (record: any) => void;
}

export default function TeamView({ users, records, selectedDate, onMarkAttendance, onEditRecord }: TeamViewProps) {
  // Get today's records for each user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getUserTodayRecord = (userId: string): any | undefined => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return records.find(r => {
      const recordDate = format(parseISO(r.date), 'yyyy-MM-dd');
      return r.userId === userId && recordDate === dateStr;
    });
  };

  // Filter out admin users, show only COURIER and HELPER
  // Sort: 1. Unmarked first, 2. Alphabetically by name
  const teamMembers = useMemo(() => {
    const filtered = users.filter(u => u.role === 'COURIER' || u.role === 'HELPER');
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    return filtered.sort((a, b) => {
      const recordA = records.find(r => {
        const recordDate = format(parseISO(r.date), 'yyyy-MM-dd');
        return r.userId === a.id && recordDate === dateStr;
      });
      const recordB = records.find(r => {
        const recordDate = format(parseISO(r.date), 'yyyy-MM-dd');
        return r.userId === b.id && recordDate === dateStr;
      });
      
      const hasRecordA = !!recordA;
      const hasRecordB = !!recordB;
      
      // Unmarked users first
      if (!hasRecordA && hasRecordB) return -1;
      if (hasRecordA && !hasRecordB) return 1;
      
      // Then alphabetically
      return a.fullName.localeCompare(b.fullName);
    });
  }, [users, records, selectedDate]);

  // Stats for the header
  const stats = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const todayRecords = records.filter(r => format(parseISO(r.date), 'yyyy-MM-dd') === dateStr);
    
    return {
      present: todayRecords.filter(r => r.type === 'ATTENDANCE').length,
      tardy: todayRecords.filter(r => r.type === 'TARDY').length,
      absent: todayRecords.filter(r => r.type === 'ABSENCE').length,
      vacation: todayRecords.filter(r => r.type === 'VACATION').length,
      disability: todayRecords.filter(r => r.type === 'DISABILITY').length,
      unmarked: teamMembers.length - todayRecords.length,
    };
  }, [records, selectedDate, teamMembers.length]);

  const formatTime = (dateStr: string): string => {
    return format(parseISO(dateStr), 'hh:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {format(selectedDate, 'EEEE d')} de {format(selectedDate, 'MMMM yyyy')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {stats.present + stats.tardy} de {teamMembers.length} empleados marcados
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">{stats.present} Presentes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">{stats.tardy} Tardanzas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-gray-600">{stats.absent} Aus. Injust.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-gray-600">{stats.vacation} Vacaciones</span>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      {teamMembers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <p className="text-gray-500">No hay empleados registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teamMembers.map((user) => {
            const record = getUserTodayRecord(user.id);
            
            return (
              <EmployeeAttendanceCard
                key={user.id}
                id={user.id}
                name={user.fullName}
                role={user.role}
                status={record?.type || null}
                checkInTime={record?.date ? formatTime(record.date) : null}
                minutesLate={record?.minutesLate}
                note={record?.reason}
                onMarkAttendance={(type, minutesLate, note, file) => 
                  onMarkAttendance(user.id, type, minutesLate, note, file)
                }
                onEdit={record ? () => onEditRecord(record) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
