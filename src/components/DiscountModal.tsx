import React, { useState } from 'react';
import { X, Percent, DollarSign } from 'lucide-react';
import { useCartStore } from '../lib/store/cartStore';
import { formatCurrency } from '../lib/utils/formatters';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
}

export function DiscountModal({ isOpen, onClose, subtotal }: DiscountModalProps) {
  const { setDescuento, clearDescuento, descuento, descuentoTipo } = useCartStore();
  const [tipo, setTipo] = useState<'fijo' | 'porcentaje'>(descuentoTipo || 'fijo');
  const [monto, setMonto] = useState(descuento?.toString() || '');

  const handleApplyDiscount = () => {
    if (monto && parseFloat(monto) > 0) {
      setDescuento(parseFloat(monto), tipo);
      onClose();
    }
  };

  const handleClear = () => {
    clearDescuento();
    setMonto('');
    onClose();
  };

  if (!isOpen) return null;

  const descuentoAmount = tipo === 'porcentaje'
    ? (subtotal * parseFloat(monto || '0') / 100)
    : parseFloat(monto || '0');

  const finalTotal = Math.max(0, subtotal - descuentoAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-pirateRed to-pirateRedDark">
          <h2 className="text-lg font-bold text-boneWhite">Aplicar Descuento</h2>
          <button
            onClick={onClose}
            className="text-boneWhite hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setTipo('fijo')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                tipo === 'fijo'
                  ? 'bg-pirateRed text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Monto Fijo
            </button>
            <button
              onClick={() => setTipo('porcentaje')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${
                tipo === 'porcentaje'
                  ? 'bg-pirateRed text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              Porcentaje
            </button>
          </div>

          <div className="relative">
            <label className="text-xs font-medium text-gray-700 block mb-2">
              {tipo === 'fijo' ? 'Descuento en $' : 'Descuento en %'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                min="0"
                step={tipo === 'porcentaje' ? '0.1' : '0.01'}
                max={tipo === 'porcentaje' ? '100' : undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed text-lg"
              />
              <span className="absolute right-4 top-2.5 text-gray-500 text-lg">
                {tipo === 'fijo' ? '$' : '%'}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {descuentoAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700 font-medium">Descuento:</span>
                <span className="text-green-700 font-bold">-{formatCurrency(descuentoAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
              <span className="text-pirateRed">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {descuento > 0 && (
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Quitar
              </button>
            )}
            <button
              onClick={handleApplyDiscount}
              disabled={!monto || parseFloat(monto) <= 0}
              className="flex-1 px-4 py-2 bg-pirateRed text-white rounded-lg hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Aplicar
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
