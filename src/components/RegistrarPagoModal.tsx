import React, { useState, useEffect } from 'react';
import { X, DollarSign, Save, History, Calendar } from 'lucide-react';
import { useCuentasPorPagarStore } from '../lib/store/cuentasPorPagarStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuenta: any;
  onSuccess: () => void;
}

export function RegistrarPagoModal({
  isOpen,
  onClose,
  cuenta,
  onSuccess,
}: RegistrarPagoModalProps) {
  const { registrarPago, fetchPagosByCuentaId, pagos, isSubmitting } = useCuentasPorPagarStore();

  const [formData, setFormData] = useState({
    monto_pagado: '',
    metodo_pago: 'efectivo',
    fecha_pago: new Date().toISOString().split('T')[0],
    notas: '',
  });

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen && cuenta) {
      setFormData({
        monto_pagado: '',
        metodo_pago: 'efectivo',
        fecha_pago: new Date().toISOString().split('T')[0],
        notas: '',
      });
      fetchPagosByCuentaId(cuenta.id);
      setShowHistory(false);
    }
  }, [isOpen, cuenta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cuenta) return;

    const montoPago = parseFloat(formData.monto_pagado);

    if (montoPago <= 0) {
      alert('El monto del pago debe ser mayor a cero');
      return;
    }

    if (montoPago > cuenta.saldo_pendiente) {
      alert(
        `El monto del pago (${formatCurrency(montoPago)}) excede el saldo pendiente (${formatCurrency(cuenta.saldo_pendiente)})`
      );
      return;
    }

    try {
      await registrarPago({
        cuenta_por_pagar_id: cuenta.id,
        monto_pagado: montoPago,
        metodo_pago: formData.metodo_pago,
        fecha_pago: formData.fecha_pago,
        notas: formData.notas || undefined,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al registrar pago:', error);
    }
  };

  const handlePagarCompleto = () => {
    setFormData({
      ...formData,
      monto_pagado: cuenta.saldo_pendiente.toString(),
    });
  };

  if (!isOpen || !cuenta) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Información de la Cuenta */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Proveedor</p>
              <p className="text-lg font-semibold text-gray-900">
                {cuenta.proveedor?.nombre || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Referencia</p>
              <p className="text-lg font-semibold text-gray-900">
                {cuenta.referencia_compra || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Monto Total</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(cuenta.monto_total)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ya Pagado</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(cuenta.monto_pagado)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Saldo Pendiente</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(cuenta.saldo_pendiente)}
              </p>
            </div>
          </div>

          {/* Botón para ver historial */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="mt-4 inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <History className="w-4 h-4 mr-2" />
            {showHistory ? 'Ocultar' : 'Ver'} Historial de Pagos ({pagos.length})
          </button>

          {/* Historial de Pagos */}
          {showHistory && pagos.length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200">
              <div className="p-3 border-b bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">
                  Historial de Pagos
                </h3>
              </div>
              <div className="divide-y">
                {pagos.map((pago) => (
                  <div key={pago.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(pago.monto_pagado)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(pago.fecha_pago)} - {pago.metodo_pago}
                      </p>
                      {pago.notas && (
                        <p className="text-xs text-gray-400 mt-1">{pago.notas}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulario de Pago */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto a Pagar *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={cuenta.saldo_pendiente}
                value={formData.monto_pagado}
                onChange={(e) =>
                  setFormData({ ...formData, monto_pagado: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>
            <button
              type="button"
              onClick={handlePagarCompleto}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Pagar saldo completo ({formatCurrency(cuenta.saldo_pendiente)})
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago *
            </label>
            <select
              value={formData.metodo_pago}
              onChange={(e) =>
                setFormData({ ...formData, metodo_pago: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta_debito">Tarjeta de Débito</option>
              <option value="tarjeta_credito">Tarjeta de Crédito</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Pago *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={formData.fecha_pago}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_pago: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Observaciones sobre el pago..."
            />
          </div>

          {/* Resumen del pago */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Resumen del Pago
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Saldo actual:</span>
                <span className="font-semibold text-blue-900">
                  {formatCurrency(cuenta.saldo_pendiente)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Monto a pagar:</span>
                <span className="font-semibold text-blue-900">
                  {formatCurrency(parseFloat(formData.monto_pagado) || 0)}
                </span>
              </div>
              <div className="border-t border-blue-200 pt-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-blue-700">Saldo restante:</span>
                  <span className="font-bold text-blue-900">
                    {formatCurrency(
                      cuenta.saldo_pendiente - (parseFloat(formData.monto_pagado) || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !formData.monto_pagado}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
