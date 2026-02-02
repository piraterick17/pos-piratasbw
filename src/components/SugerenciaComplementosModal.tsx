import React from 'react';
import { X, Coffee, Cookie } from 'lucide-react';

interface SugerenciaComplementosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (agregarComplementos: boolean) => void;
  faltaAcompanamiento: boolean;
  faltaPostre: boolean;
}

export function SugerenciaComplementosModal({
  isOpen,
  onClose,
  onConfirmar,
  faltaAcompanamiento,
  faltaPostre
}: SugerenciaComplementosModalProps) {
  if (!isOpen) return null;

  const mensajes = [];
  if (faltaAcompanamiento) {
    mensajes.push('acompañamiento');
  }
  if (faltaPostre) {
    mensajes.push('postre');
  }

  const mensajeCompleto = mensajes.join(' o ');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Confirmar Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-4 space-x-4">
            {faltaAcompanamiento && (
              <Coffee className="w-16 h-16 text-amber-500" />
            )}
            {faltaPostre && (
              <Cookie className="w-16 h-16 text-pink-500" />
            )}
          </div>

          <p className="text-center text-gray-700 text-lg mb-6">
            ¿Se le preguntó al cliente si desea agregar algún <span className="font-semibold">{mensajeCompleto}</span>?
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => onConfirmar(true)}
              className="flex-1 px-4 py-4 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-base shadow-md hover:shadow-lg min-h-12"
            >
              Sí, agregar
            </button>
            <button
              onClick={() => onConfirmar(false)}
              className="flex-1 px-4 py-4 sm:py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 active:bg-gray-600 transition-colors font-semibold text-base shadow-md hover:shadow-lg min-h-12"
            >
              No, continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
