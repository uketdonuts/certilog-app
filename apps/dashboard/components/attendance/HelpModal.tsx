'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorDefinitions = [
  {
    key: 'green',
    emoji: '🟢',
    title: 'Verde – Asistencia Correcta',
    items: ['Presente', 'Entrada y salida en horario', 'Jornada completa cumplida'],
    conclusion: 'Todo OK / sin novedades',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'yellow',
    emoji: '🟡',
    title: 'Amarillo – Alerta',
    items: ['Tardanza', 'Salida anticipada', 'Permiso parcial', 'Pendiente de justificación'],
    conclusion: 'Requiere seguimiento',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-600',
  },
  {
    key: 'red',
    emoji: '🔴',
    title: 'Rojo – Incumplimiento',
    items: ['Ausencia injustificada', 'No marcó entrada o salida', 'Inasistencia total'],
    conclusion: 'Impacta indicadores / requiere acción inmediata',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-800',
    iconColor: 'text-rose-600',
  },
  {
    key: 'blue',
    emoji: '🔵',
    title: 'Azul – Ausencia Justificada',
    items: ['Vacaciones', 'Incapacidad médica', 'Licencia aprobada', 'Permiso con goce'],
    conclusion: 'No afecta desempeño',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    textColor: 'text-sky-800',
    iconColor: 'text-sky-600',
  },
  {
    key: 'purple',
    emoji: '🟣',
    title: 'Morado – Registro Especial',
    items: ['Horas extras', 'Turno especial', 'Trabajo nocturno', 'Apoyo fuera de horario'],
    conclusion: 'Condición especial aprobada',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-800',
    iconColor: 'text-violet-600',
  },
  {
    key: 'gray',
    emoji: '⚫',
    title: 'Gris – Sin Información',
    items: ['Pendiente de registro', 'Error de sistema', 'Falta validación del supervisor'],
    conclusion: 'Dato incompleto',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
  },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-50 to-white">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Parámetros de Asistencia
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Guía de colores y significados
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-4">
            <div className="grid gap-4">
              {colorDefinitions.map((def) => (
                <div
                  key={def.key}
                  className={`${def.bgColor} ${def.borderColor} border rounded-xl p-4 transition-all duration-200 hover:shadow-md`}
                >
                  <div className="flex items-start gap-4">
                    {/* Emoji Icon */}
                    <div className="text-3xl flex-shrink-0">
                      {def.emoji}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold ${def.textColor} text-lg mb-2`}>
                        {def.title}
                      </h3>

                      {/* Items */}
                      <ul className="space-y-1 mb-3">
                        {def.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm text-gray-700"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${def.iconColor}`} />
                            {item}
                          </li>
                        ))}
                      </ul>

                      {/* Conclusion */}
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 ${def.textColor} text-sm font-medium`}>
                        <span>👉</span>
                        {def.conclusion}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips Section */}
            <div className="mt-6 p-4 bg-primary-50 border border-primary-100 rounded-xl">
              <h4 className="font-semibold text-primary-900 mb-2 flex items-center gap-2">
                <span>💡</span>
                Consejos de uso
              </h4>
              <ul className="space-y-2 text-sm text-primary-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>Haz clic en cualquier tarjeta de empleado para marcar su asistencia rápidamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>La vista <strong>Equipo</strong> muestra el estado actual de todos los empleados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>La vista <strong>Calendario</strong> permite ver el historial mensual</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>La vista <strong>Historial</strong> muestra todos los registros con filtros avanzados</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition shadow-md shadow-primary-600/20"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
