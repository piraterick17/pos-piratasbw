import React from 'react';
import { Check, X } from 'lucide-react';

interface ProgressIndicatorProps {
  clienteSeleccionado: any;
  tipoEntregaId: number | null;
  carritoCount: number;
  direccionCompleta: boolean;
  isComplete: boolean;
}

export function ProgressIndicator({
  clienteSeleccionado,
  tipoEntregaId,
  carritoCount,
  direccionCompleta,
  isComplete,
}: ProgressIndicatorProps) {
  const requirements = [
    {
      label: 'Cliente',
      completed: !!clienteSeleccionado,
    },
    {
      label: 'Tipo Entrega',
      completed: !!tipoEntregaId,
    },
    {
      label: 'Dirección',
      completed: direccionCompleta,
    },
    {
      label: 'Productos',
      completed: carritoCount > 0,
    },
  ];

  const completedCount = requirements.filter(r => r.completed).length;
  const progress = (completedCount / requirements.length) * 100;

  return (
    <div className="p-3 bg-white border-b border-gray-200 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">Configuración</span>
        <span className="text-xs font-bold text-pirateRed">{completedCount}/4</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-pirateRed to-green-500 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {requirements.map((req, idx) => (
          <div key={idx} className="flex items-center space-x-1">
            {req.completed ? (
              <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-red-400 flex-shrink-0" />
            )}
            <span className={`text-[10px] font-medium ${req.completed ? 'text-green-700' : 'text-red-600'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>

      {!isComplete && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
          Completa los campos requeridos para continuar
        </div>
      )}
    </div>
  );
}
