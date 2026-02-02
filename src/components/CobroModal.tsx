import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Calculator, CheckCircle, Plus, Trash2, User, Truck } from 'lucide-react';
import { formatCurrency } from '../lib/utils/formatters';

interface Pago {
  metodo_pago: string;
  monto: number;
}

interface CobroModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
  onFinalizar: (pagos: Pago[], estadoFinal: 'completado' | 'pendiente', descuento?: number) => Promise<void>;
  isSubmitting?: boolean;
  cliente?: any;
  tipoEntrega?: any;
}

export function CobroModal({ isOpen, onClose, pedido, onFinalizar, isSubmitting, cliente, tipoEntrega }: CobroModalProps) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [montoRecibido, setMontoRecibido] = useState<number | string>('');
  const [metodoPagoActual, setMetodoPagoActual] = useState('');
  const [descuento, setDescuento] = useState<number | string>('');

  const subtotal = pedido?.subtotal || 0;
  const descuentoAplicado = Number(descuento) || 0;
  const totalConDescuento = subtotal - descuentoAplicado + (pedido?.costo_envio || 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoPendiente = totalConDescuento - totalPagado;
  const cambio = montoRecibido && metodoPagoActual === 'efectivo' ? Math.max(0, Number(montoRecibido) - saldoPendiente) : 0;

useEffect(() => {
    if (isOpen && pedido) {
      setPagos([]);
      
      // 1. CORRECCIÓN: Respetar el descuento que ya viene del pedido
      // Si el pedido trae descuentos, los ponemos en el estado inicial
      const descuentoInicial = pedido.descuentos || 0;
      setDescuento(descuentoInicial > 0 ? descuentoInicial : '');

      // 2. CORRECCIÓN: Calcular el monto inicial a pagar usando ese descuento
      const totalInicial = (pedido.subtotal || 0) - descuentoInicial + (pedido.costo_envio || 0);
      setMontoRecibido(Math.max(0, totalInicial).toFixed(2));
      
      setMetodoPagoActual('efectivo');
    }
    // 3. CORRECCIÓN: Quitamos 'totalConDescuento' de las dependencias para evitar que
    // el campo se resetee mientras escribes. Solo reacciona a 'isOpen' y 'pedido'.
  }, [isOpen, pedido]);

  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'debito', label: 'Tarjeta de Débito' },
    { value: 'credito', label: 'Tarjeta de Crédito' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'credito_cliente', label: 'Crédito Cliente' },
  ];

  const handleAddPago = () => {
    if (!metodoPagoActual || Number(montoRecibido) <= 0) {
      return;
    }

    // Validate customer credit if using credit payment method
    if (metodoPagoActual === 'credito_cliente') {
      const clienteSaldoActual = pedido?.cliente_saldo_actual || 0;
      const montoAPagar = Number(montoRecibido);
      if (montoAPagar > clienteSaldoActual) {
        alert(`Crédito insuficiente. Saldo disponible: ${clienteSaldoActual}`);
        return;
      }
    }

    const nuevoPago = {
      metodo_pago: metodoPagoActual,
      monto: Number(montoRecibido),
    };
    setPagos([...pagos, nuevoPago]);
    setMontoRecibido('');
    setMetodoPagoActual('');
  };

  const handleRemovePago = (index: number) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const handleFinalizar = (estado: 'completado' | 'pendiente') => {
    // Validate discount
    if (descuentoAplicado < 0) {
      return;
    }
    if (descuentoAplicado > subtotal) {
      return;
    }

    let pagosFinales = [...pagos];
    // Si hay un monto pendiente en los inputs, lo agregamos
    if (Number(montoRecibido) > 0 && metodoPagoActual) {
      pagosFinales.push({ metodo_pago: metodoPagoActual, monto: Number(montoRecibido) });
    }
    onFinalizar(pagosFinales, estado, descuentoAplicado);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg h-[calc(100dvh-2rem)] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Registrar Cobro</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {/* Cliente y Tipo Entrega */}
          {(cliente || tipoEntrega) && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg mb-4 space-y-2">
              {cliente && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700"><strong>{cliente.nombre}</strong></span>
                </div>
              )}
              {tipoEntrega && (
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700">{tipoEntrega.nombre}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <label className="flex-1">Descuento:</label>
              <input
                type="number"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                min="0"
                max={subtotal}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            {descuentoAplicado > 0 && (
              <div className="flex justify-between text-sm mt-2 text-green-600">
                <span>Total con descuento:</span>
                <span className="font-semibold">{formatCurrency(totalConDescuento)}</span>
              </div>
            )}
            {(pedido?.costo_envio || 0) > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span>Envío:</span>
                <span className="font-semibold">{formatCurrency(pedido?.costo_envio || 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-1">
              <span>Total Pagado:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalPagado)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
              <span>Saldo Pendiente:</span>
              <span className={saldoPendiente > 0.009 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(Math.max(0, saldoPendiente))}</span>
            </div>
          </div>

          {/* Lista de pagos agregados */}
          {pagos.length > 0 && (
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-2">
              {pagos.map((pago, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                  <span className="text-sm font-medium">{pago.metodo_pago.charAt(0).toUpperCase() + pago.metodo_pago.slice(1)}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(pago.monto)}</span>
                  <button onClick={() => handleRemovePago(index)} className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0 ml-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Sugerencia de balance pendiente */}
          {saldoPendiente > 0.009 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800 font-semibold">Balance pendiente: {formatCurrency(saldoPendiente)}</p>
              <button
                onClick={() => setMontoRecibido(saldoPendiente.toFixed(2))}
                className="text-xs text-yellow-700 hover:text-yellow-900 underline mt-1"
              >
                Usar monto pendiente
              </button>
            </div>
          )}

          {/* Formulario para nuevo pago */}
          {saldoPendiente > 0.009 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              <select
                value={metodoPagoActual}
                onChange={(e) => setMetodoPagoActual(e.target.value)}
                className="border-gray-300 rounded-lg text-sm sm:text-base"
              >
                <option value="" disabled>Método</option>
                {metodosPago.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <input
                type="number"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                placeholder="Monto"
                className="border-gray-300 rounded-lg text-sm sm:text-base"
              />
              <button onClick={handleAddPago} className="bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm flex items-center justify-center py-2">
                <Plus className="w-4 h-4 mr-1" /> Añadir
              </button>
            </div>
          )}

          {/* Cálculo del Cambio */}
          {cambio > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-center">
              <p className="font-semibold text-yellow-800">Cambio a devolver:</p>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(cambio)}</p>
            </div>
          )}

        </div>

        <div className="sticky bottom-0 left-0 right-0 bg-white border-t flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 flex-shrink-0 shadow-lg shadow-black/5">
          <button
            onClick={() => handleFinalizar('pendiente')}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors text-sm sm:text-base font-medium"
            disabled={isSubmitting}
          >
            Guardar Pendiente
          </button>
          <button
            onClick={() => handleFinalizar('completado')}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm sm:text-base font-medium"
            disabled={isSubmitting || (saldoPendiente > 0.009 && !montoRecibido)}
          >
            {isSubmitting ? 'Procesando...' : 'Finalizar Venta'}
          </button>
        </div>
      </div>
    </div>
  );
}