import React, { useEffect, useState } from 'react';
import { X, User, Phone, Truck, AlertCircle } from 'lucide-react';
import { useAsignacionesStore, Repartidor } from '../lib/store/asignacionesStore';

interface AsignarRepartidorModalProps {
  isOpen: boolean;
  onClose: () => void;
  asignacionId: number;
  pedidoNumero?: string;
}

export function AsignarRepartidorModal({
  isOpen,
  onClose,
  asignacionId,
  pedidoNumero
}: AsignarRepartidorModalProps) {
  const { repartidores, fetchRepartidoresDisponibles, asignarRepartidor } = useAsignacionesStore();
  const [selectedRepartidorId, setSelectedRepartidorId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRepartidoresDisponibles();
      setSelectedRepartidorId(null);
    }
  }, [isOpen, fetchRepartidoresDisponibles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRepartidorId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await asignarRepartidor(asignacionId, selectedRepartidorId);
      onClose();
    } catch (error) {
      console.error('Error al asignar repartidor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const repartidoresDisponibles = repartidores.filter(r => r.activo);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Asignar Repartidor</h2>
            {pedidoNumero && (
              <p className="text-sm text-gray-500 mt-1">Pedido #{pedidoNumero}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {repartidoresDisponibles.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay repartidores disponibles</p>
              <p className="text-sm text-gray-500 mt-2">
                Crea un repartidor en la sección de Repartidores
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {repartidoresDisponibles.map((repartidor) => (
                <label
                  key={repartidor.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRepartidorId === repartidor.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="repartidor"
                    value={repartidor.id}
                    checked={selectedRepartidorId === repartidor.id}
                    onChange={() => setSelectedRepartidorId(repartidor.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />

                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{repartidor.nombre}</span>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Repartidor
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {repartidor.email}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {repartidoresDisponibles.length > 0 && (
            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedRepartidorId || isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
