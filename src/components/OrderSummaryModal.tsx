import React from 'react';
import { X, Package, User, Truck, MapPin, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/utils/formatters';

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cliente: any;
  tipoEntrega: any;
  items: any[];
  subtotal: number;
  descuento: number;
  descuentoTipo: 'fijo' | 'porcentaje';
  costoEnvio: number;
  direccion: any;
  zonaEntrega: any;
  notasEntrega: string;
  notas: string;
}

export function OrderSummaryModal({
  isOpen,
  onClose,
  onConfirm,
  cliente,
  tipoEntrega,
  items,
  subtotal,
  descuento,
  descuentoTipo,
  costoEnvio,
  direccion,
  zonaEntrega,
  notasEntrega,
  notas,
}: OrderSummaryModalProps) {
  if (!isOpen) return null;

  const descuentoAmount = descuentoTipo === 'porcentaje'
    ? (subtotal * descuento / 100)
    : descuento;

  const totalConDescuento = subtotal - descuentoAmount;
  const total = totalConDescuento + costoEnvio;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-gradient-to-r from-pirateRed to-pirateRedDark">
          <h2 className="text-lg font-bold text-boneWhite">Resumen de Pedido</h2>
          <button
            onClick={onClose}
            className="text-boneWhite hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cliente */}
          <div className="flex items-start gap-3 pb-4 border-b">
            <User className="w-5 h-5 text-pirateRed flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-600">Cliente</p>
              <p className="text-lg font-bold text-gray-900">{cliente?.nombre}</p>
              {cliente?.telefono && (
                <p className="text-xs text-gray-600">📞 {cliente.telefono}</p>
              )}
            </div>
          </div>

          {/* Entrega */}
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-pirateRed flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-600">Tipo de Entrega</p>
                <p className="text-lg font-bold text-gray-900">{tipoEntrega?.nombre}</p>
              </div>
            </div>

            {direccion && (
              <div className="flex items-start gap-3 ml-8">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{direccion.calle}</p>
                  {zonaEntrega && (
                    <p className="text-gray-600">Zona: {zonaEntrega.nombre}</p>
                  )}
                  {notasEntrega && (
                    <p className="text-gray-600 italic">{notasEntrega}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-pirateRed" />
              <p className="text-sm font-bold text-gray-900">Productos ({items.length})</p>
            </div>
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                    <p className="text-xs text-gray-600">{item.cantidad}x @ {formatCurrency(item.precio)}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-2">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {descuentoAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Descuento:</span>
                <span className="text-green-700 font-bold">-{formatCurrency(descuentoAmount)}</span>
              </div>
            )}

            {costoEnvio > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío:</span>
                <span className="font-medium">{formatCurrency(costoEnvio)}</span>
              </div>
            )}

            {costoEnvio === 0 && tipoEntrega?.tiene_costo_asociado && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío:</span>
                <span className="text-green-600 font-medium">GRATIS</span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>TOTAL:</span>
              <span className="text-pirateRed">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notas */}
          {notas && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Notas:</p>
                <p className="text-blue-800">{notas}</p>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Editar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
