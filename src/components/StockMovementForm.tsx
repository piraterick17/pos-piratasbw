import React, { useState } from 'react';
import { X, Package, Plus, Minus, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import { useProductosStore, type Producto } from '../lib/store/productosStore';
import { formatCurrency } from '../lib/utils/formatters';

interface StockMovementFormProps {
  isOpen: boolean;
  onClose: () => void;
  producto: Producto;
  onSuccess?: () => void;
}

export function StockMovementForm({ isOpen, onClose, producto, onSuccess }: StockMovementFormProps) {
  const { createStockMovement, isSubmitting } = useProductosStore();
  
  const [formData, setFormData] = useState({
    cantidad: 0,
    tipo_movimiento: '',
    motivo: '',
  });

  const [movementType, setMovementType] = useState<'entrada' | 'salida'>('entrada');

  const tiposMovimiento = {
    entrada: [
      { value: 'compra', label: 'Compra a proveedor' },
      { value: 'devolucion', label: 'Devolución de cliente' },
      { value: 'ajuste_manual', label: 'Ajuste por conteo físico (entrada)' },
    ],
    salida: [
      { value: 'venta', label: 'Venta a cliente' },
      { value: 'merma', label: 'Merma / Caducado' },
      { value: 'ajuste_manual', label: 'Ajuste por conteo físico (salida)' },
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo_movimiento || formData.cantidad === 0) {
      return;
    }

    try {
      const cantidad = movementType === 'salida' ? -Math.abs(formData.cantidad) : Math.abs(formData.cantidad);
      
      await createStockMovement({
        producto_id: producto.id!,
        cantidad,
        tipo_movimiento: formData.tipo_movimiento,
        motivo: formData.motivo.trim() || undefined,
      });
      
      onSuccess?.();
      onClose();
      
      // Reset form
      setFormData({
        cantidad: 0,
        tipo_movimiento: '',
        motivo: '',
      });
      setMovementType('entrada');
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      cantidad: 0,
      tipo_movimiento: '',
      motivo: '',
    });
    setMovementType('entrada');
  };

  const stockResultante = (producto.stock_actual || 0) + (movementType === 'salida' ? -Math.abs(formData.cantidad) : Math.abs(formData.cantidad));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-pirateRedDark flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-pirateRed" />
            Ajustar Stock
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Product Info */}
          <div className="bg-boneWhite p-4 rounded-lg mb-6 border border-pirateRed border-opacity-20">
            <h3 className="text-lg font-semibold text-pirateRedDark mb-2">{producto.nombre}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Stock Actual:</span> {producto.stock_actual || 0} {producto.unidad_medida}
              </div>
              <div>
                <span className="font-medium">Precio:</span> {formatCurrency(producto.precio_regular)}
              </div>
              {producto.codigo && (
                <div>
                  <span className="font-medium">Código:</span> {producto.codigo}
                </div>
              )}
              {producto.categoria?.nombre && (
                <div>
                  <span className="font-medium">Categoría:</span> {producto.categoria.nombre}
                </div>
              )}
            </div>
          </div>

          {/* Movement Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMovementType('entrada');
                  setFormData({ ...formData, tipo_movimiento: '' });
                }}
                className={`p-4 border-2 rounded-lg transition-colors flex items-center justify-center ${
                  movementType === 'entrada'
                    ? 'border-pirateRed bg-pirateRed bg-opacity-10 text-pirateRedDark'
                    : 'border-gray-300 hover:border-pirateRed hover:bg-pirateRed hover:bg-opacity-5'
                }`}
              >
                <Plus className="w-5 h-5 mr-2" />
                Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementType('salida');
                  setFormData({ ...formData, tipo_movimiento: '' });
                }}
                className={`p-4 border-2 rounded-lg transition-colors flex items-center justify-center ${
                  movementType === 'salida'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-red-300'
                }`}
              >
                <Minus className="w-5 h-5 mr-2" />
                Salida (-)
              </button>
            </div>
          </div>

          {/* Movement Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del Movimiento *
              </label>
              <select
                value={formData.tipo_movimiento}
                onChange={(e) => setFormData({ ...formData, tipo_movimiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                required
              >
                <option value="">Seleccionar motivo</option>
                {tiposMovimiento[movementType].map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.cantidad || ''}
                  onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  required
                />
                <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                  {producto.unidad_medida}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas / Comentarios
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                placeholder="Detalles adicionales del movimiento..."
              />
            </div>
          </div>

          {/* Stock Preview */}
          {formData.cantidad > 0 && (
            <div className="mt-6 p-4 bg-pirateRed bg-opacity-10 border border-pirateRed border-opacity-30 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="w-5 h-5 text-pirateRed mr-2" />
                <h4 className="font-semibold text-pirateRedDark">Resumen del Movimiento</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Stock Actual:</span>
                  <div className="font-semibold">{producto.stock_actual || 0} {producto.unidad_medida}</div>
                </div>
                <div>
                  <span className="text-gray-600">Movimiento:</span>
                  <div className={`font-semibold ${movementType === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {movementType === 'entrada' ? '+' : '-'}{formData.cantidad} {producto.unidad_medida}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Stock Resultante:</span>
                  <div className={`font-semibold ${stockResultante < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stockResultante} {producto.unidad_medida}
                  </div>
                </div>
              </div>
              
              {stockResultante < 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="text-sm text-red-700">
                    ⚠️ El stock resultante será negativo. Verifica la cantidad.
                  </span>
                </div>
              )}
              
              {stockResultante <= (producto.stock_minimo || 0) && stockResultante >= 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-700">
                    ⚠️ El stock resultante estará por debajo del mínimo ({producto.stock_minimo} {producto.unidad_medida}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.tipo_movimiento || formData.cantidad === 0}
              className="px-6 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}