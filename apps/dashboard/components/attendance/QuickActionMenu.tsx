'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  SparklesIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type AttendanceType = 'ATTENDANCE' | 'ABSENCE' | 'VACATION' | 'DISABILITY' | 'TARDY' | 'OVERTIME';

interface QuickActionMenuProps {
  onSelect: (type: AttendanceType, minutesLate?: number, note?: string, file?: File | null) => void;
  onEdit?: () => void;
  currentType?: AttendanceType | null;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const actions = [
  { type: 'ATTENDANCE' as AttendanceType, label: 'Presente', icon: CheckCircleIcon, color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100' },
  { type: 'TARDY' as AttendanceType, label: 'Tardanza', icon: ClockIcon, color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100' },
  { type: 'ABSENCE' as AttendanceType, label: 'Ausente (Injustificada)', icon: XCircleIcon, color: 'text-rose-600', bgColor: 'bg-rose-50 hover:bg-rose-100' },
  { type: 'VACATION' as AttendanceType, label: 'Vacaciones', icon: CalendarIcon, color: 'text-sky-600', bgColor: 'bg-sky-50 hover:bg-sky-100' },
  { type: 'DISABILITY' as AttendanceType, label: 'Incapacidad', icon: ExclamationTriangleIcon, color: 'text-violet-600', bgColor: 'bg-violet-50 hover:bg-violet-100' },
  { type: 'OVERTIME' as AttendanceType, label: 'Horas Extras', icon: SparklesIcon, color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100' },
];

export default function QuickActionMenu({ onSelect, onEdit, currentType, isOpen, onClose, anchorRef }: QuickActionMenuProps) {
  const [selectedType, setSelectedType] = useState<AttendanceType | null>(null);
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleActionClick = (type: AttendanceType) => {
    if (type === 'TARDY' || type === 'OVERTIME') {
      setSelectedType(type);
    } else {
      onSelect(type, undefined, note || undefined, selectedFile);
      setNote('');
      setSelectedFile(null);
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType, minutes ? parseInt(minutes) : undefined, note || undefined, selectedFile);
      setMinutes('');
      setNote('');
      setSelectedFile(null);
      setSelectedType(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Calculate position based on anchor element
  const anchorRect = anchorRef.current?.getBoundingClientRect();
  
  // Default styles with scroll support for small screens
  const baseStyle: React.CSSProperties = {
    maxHeight: `calc(100vh - 32px)`,
    overflowY: 'auto',
  };
  
  const style: React.CSSProperties = anchorRect ? {
    position: 'fixed',
    top: Math.min(anchorRect.bottom + 8, Math.max(8, window.innerHeight - 400)),
    left: Math.min(anchorRect.left, window.innerWidth - 280),
    zIndex: 50,
    ...baseStyle,
  } : baseStyle;

  return (
    <div
      ref={menuRef}
      style={style}
      className="bg-white rounded-xl shadow-xl border border-gray-100 p-3 w-64 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {!selectedType ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-2 py-1">
            Marcar como
          </p>
          {actions.map((action) => {
            const Icon = action.icon;
            const isActive = currentType === action.type;
            return (
              <button
                key={action.type}
                onClick={() => handleActionClick(action.type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive 
                    ? 'bg-gray-100 text-gray-400 cursor-default' 
                    : `${action.bgColor} ${action.color}`
                }`}
                disabled={isActive}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm">
                  {action.label}
                  {isActive && ' (actual)'}
                </span>
              </button>
            );
          })}
          {onEdit && (
            <>
              <div className="h-px bg-gray-100 my-2" />
              <button
                onClick={() => { onEdit(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-600 transition-all duration-150"
              >
                <PencilIcon className="h-5 w-5" />
                <span className="font-medium text-sm">Editar detalles</span>
              </button>
            </>
          )}
          <div className="mt-2 px-2">
            <input
              type="text"
              placeholder="Agregar nota (opcional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 ${selectedType === 'OVERTIME' ? 'text-purple-600' : 'text-amber-600'}`}>
            {selectedType === 'OVERTIME' ? <SparklesIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
            <span className="font-medium">
              {selectedType === 'OVERTIME' ? 'Registrar horas extras' : 'Registrar tardanza'}
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {selectedType === 'OVERTIME' ? 'Minutos extras trabajados' : 'Minutos de retraso'}
            </label>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder={selectedType === 'OVERTIME' ? "60" : "15"}
              autoFocus
              className={`w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 ${
                selectedType === 'OVERTIME' ? 'focus:ring-purple-500' : 'focus:ring-amber-500'
              } focus:border-transparent`}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nota / Motivo (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={selectedType === 'OVERTIME' ? "Proyecto urgente, etc." : "Tráfico, etc."}
              className={`w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 ${
                selectedType === 'OVERTIME' ? 'focus:ring-purple-500' : 'focus:ring-amber-500'
              } focus:border-transparent`}
            />
          </div>
          
          {/* File Upload */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Adjuntar archivo (opcional)</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            
            {!selectedFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition text-sm text-gray-600"
              >
                <PaperClipIcon className="h-4 w-4" />
                <span>Seleccionar archivo...</span>
              </button>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <PaperClipIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{selectedFile.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              PDF, imágenes o documentos (máx. 5MB)
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setSelectedType(null)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Atrás
            </button>
            <button
              onClick={handleConfirm}
              disabled={!minutes}
              className={`flex-1 px-3 py-2 text-sm text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition ${
                selectedType === 'OVERTIME' 
                  ? 'bg-purple-500 hover:bg-purple-600' 
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
