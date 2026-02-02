import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface TiempoEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (minutos: number) => void;
}

export function TiempoEntregaModal({ isOpen, onClose, onConfirmar }: TiempoEntregaModalProps) {
  const [minutos, setMinutos] = useState<string>('30');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirmar = () => {
    const minutosNum = parseInt(minutos);
    const TIEMPO_MINIMO = 5;
    const TIEMPO_MAXIMO = 480;

    if (!minutos || isNaN(minutosNum)) {
      setError('Ingresa un tiempo válido');
      return;
    }

    if (minutosNum < TIEMPO_MINIMO) {
      setError(`El tiempo mínimo es ${TIEMPO_MINIMO} minutos`);
      return;
    }

    if (minutosNum > TIEMPO_MAXIMO) {
      setError(`El tiempo máximo es ${TIEMPO_MAXIMO} minutos (8 horas)`);
      return;
    }

    onConfirmar(minutosNum);
    setMinutos('30');
    setError('');
  };

  const tiemposSugeridos = [15, 20, 30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Tiempo de Entrega
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-4">
            <Clock className="w-16 h-16 text-pirateRed" />
          </div>

          <p className="text-center text-gray-700 mb-6">
            ¿Cuánto tiempo de entrega se le comentó al cliente?
          </p>

          {/* Tiempos sugeridos */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {tiemposSugeridos.map((tiempo) => (
              <button
                key={tiempo}
                onClick={() => {
                  setMinutos(tiempo.toString());
                  setError('');
                }}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  minutos === tiempo.toString()
                    ? 'border-pirateRed bg-pirateRed bg-opacity-10 text-pirateRed font-semibold'
                    : 'border-gray-300 hover:border-gray-400 text-gray-700'
                }`}
              >
                {tiempo} min
              </button>
            ))}
          </div>

          {/* Input manual */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              O ingresa un tiempo personalizado (minutos)
            </label>
            <input
              type="number"
              min="1"
              max="480"
              value={minutos}
              onChange={(e) => {
                setMinutos(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
              placeholder="Ej: 30"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleConfirmar}
            className="w-full px-4 py-3 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark transition-colors font-medium"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
