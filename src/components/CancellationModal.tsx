import React, { useState } from 'react';
import { X, AlertTriangle, MessageSquare } from 'lucide-react';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (justificacion: string) => void;
  isSubmitting?: boolean;
}

export function CancellationModal({ isOpen, onClose, onConfirm, isSubmitting }: CancellationModalProps) {
  const [justificacion, setJustificacion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (justificacion.trim()) {
      onConfirm(justificacion.trim());
      setJustificacion('');
    }
  };

  const handleClose = () => {
    setJustificacion('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Cancelar Pedido
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Warning Message */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  ¿Estás seguro de que quieres cancelar este pedido?
                </h3>
                <p className="text-sm text-red-700">
                  Esta acción cambiará el estado del pedido a "Cancelado" y requerirá una justificación.
                </p>
              </div>
            </div>
          </div>

          {/* Justification Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              Motivo de la Cancelación *
            </label>
            <textarea
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Explica el motivo por el cual se cancela este pedido..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Este motivo se guardará en las observaciones del pedido para futuras referencias.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !justificacion.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}