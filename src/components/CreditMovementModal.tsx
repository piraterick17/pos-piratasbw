import React, { useState } from 'react';
import { X, DollarSign, Plus, Minus, FileText } from 'lucide-react';
import { useClientesStore, type Cliente, type MovimientoCredito } from '../lib/store/clientesStore';
import { formatCurrency } from '../lib/utils/formatters';

interface CreditMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente;
  movementType: 'cargo' | 'abono';
}

export function CreditMovementModal({ isOpen, onClose, cliente, movementType }: CreditMovementModalProps) {
  const { createCreditoMovimiento, isSubmitting } = useClientesStore();
  
  const [formData, setFormData] = useState({
    monto: 0,
    motivo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.monto <= 0) {
      return;
    }

    try {
      const movimiento: MovimientoCredito = {
        cliente_id: cliente.id!,
        tipo_movimiento: movementType,
        monto: formData.monto,
        motivo: formData.motivo.trim() || undefined,
      };
      
      await createCreditoMovimiento(movimiento);
      onClose();
      
      // Reset form
      setFormData({
        monto: 0,
        motivo: '',
      });
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      monto: 0,
      motivo: '',
    });
  };

  const saldoActual = cliente.saldo_actual || 0;
  const nuevoSaldo = movementType === 'cargo' 
    ? saldoActual + formData.monto 
    : saldoActual - formData.monto;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            {movementType === 'cargo' ? (
              <>
                <Plus className="w-5 h-5 mr-2 text-red-600" />
                Añadir Deuda
              </>
            ) : (
              <>
                <Minus className="w-5 h-5 mr-2 text-green-600" />
                Registrar Pago
              </>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Client Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{cliente.nombre}</h3>
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Saldo Actual:</span>
                <span className={saldoActual >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(Math.abs(saldoActual))} {saldoActual >= 0 ? '(debe)' : '(a favor)'}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.monto || ''}
                onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo / Concepto
            </label>
            <textarea
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                movementType === 'cargo' 
                  ? "Ej: Venta a crédito, Intereses, etc."
                  : "Ej: Pago en efectivo, Transferencia, etc."
              }
            />
          </div>

          {/* Preview */}
          {formData.monto > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Resumen del Movimiento</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Saldo Actual:</span>
                  <span className={saldoActual >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(Math.abs(saldoActual))} {saldoActual >= 0 ? '(debe)' : '(a favor)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {movementType === 'cargo' ? 'Añadir:' : 'Restar:'}
                  </span>
                  <span className={movementType === 'cargo' ? 'text-red-600' : 'text-green-600'}>
                    {movementType === 'cargo' ? '+' : '-'}{formatCurrency(formData.monto)}
                  </span>
                </div>
                <hr className="border-blue-200" />
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Nuevo Saldo:</span>
                  <span className={nuevoSaldo >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(Math.abs(nuevoSaldo))} {nuevoSaldo >= 0 ? '(debe)' : '(a favor)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.monto <= 0}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                movementType === 'cargo'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'Registrando...' : (
                movementType === 'cargo' ? 'Añadir Deuda' : 'Registrar Pago'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}