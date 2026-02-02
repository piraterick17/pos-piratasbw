import React, { useState, useEffect } from 'react';
import { X, Package, Plus, Minus, FileText, AlertCircle, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { useInsumosStore, type Insumo } from '../lib/store/insumosStore';
import { useProveedoresStore } from '../lib/store/proveedoresStore';
import { formatCurrency } from '../lib/utils/formatters';

interface MovimientoInsumoFormProps {
  isOpen: boolean;
  onClose: () => void;
  insumo: Insumo;
  onSuccess?: () => void;
}

export function MovimientoInsumoForm({ isOpen, onClose, insumo, onSuccess }: MovimientoInsumoFormProps) {
  const { createMovimientoInsumo, isSubmitting } = useInsumosStore();
  const { proveedores, fetchProveedores } = useProveedoresStore();

  const [formData, setFormData] = useState({
    cantidad: 0,
    tipo_movimiento: '',
    motivo: '',
    proveedor_id: '',
    costo_unitario: 0,
    referencia_compra: '',
    es_credito: false,
    dias_credito: 30,
    fecha_esperada_entrega: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProveedores();
    }
  }, [isOpen, fetchProveedores]);

  const [movementType, setMovementType] = useState<'entrada' | 'salida'>('entrada');

  const tiposMovimiento = {
    entrada: [
      { value: 'compra', label: 'Compra a proveedor' },
      { value: 'ajuste', label: 'Ajuste de inventario (entrada)' },
    ],
    salida: [
      { value: 'merma', label: 'Merma / Pérdida' },
      { value: 'ajuste', label: 'Ajuste de inventario (salida)' },
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipo_movimiento || formData.cantidad === 0) {
      return;
    }

    // Validar campos requeridos para compras
    if (formData.tipo_movimiento === 'compra') {
      if (!formData.proveedor_id) {
        alert('Debe seleccionar un proveedor para las compras');
        return;
      }
      if (formData.costo_unitario <= 0) {
        alert('El costo unitario debe ser mayor a cero');
        return;
      }
    }

    try {
      const cantidad = movementType === 'salida' ? -Math.abs(formData.cantidad) : Math.abs(formData.cantidad);

      const movimientoData: any = {
        insumo_id: insumo.id!,
        cantidad,
        tipo_movimiento: formData.tipo_movimiento as any,
        motivo: formData.motivo.trim() || undefined,
      };

      // Agregar campos de compra si aplica
      if (formData.tipo_movimiento === 'compra') {
        movimientoData.proveedor_id = parseInt(formData.proveedor_id);
        movimientoData.costo_unitario = formData.costo_unitario;
        movimientoData.costo_total = formData.costo_unitario * Math.abs(formData.cantidad);
        movimientoData.referencia_compra = formData.referencia_compra || undefined;
        movimientoData.es_credito = formData.es_credito;
        movimientoData.dias_credito = formData.es_credito ? formData.dias_credito : 0;
        movimientoData.fecha_esperada_entrega = formData.fecha_esperada_entrega || undefined;
      }

      await createMovimientoInsumo(movimientoData);

      onSuccess?.();
      onClose();

      // Reset form
      setFormData({
        cantidad: 0,
        tipo_movimiento: '',
        motivo: '',
        proveedor_id: '',
        costo_unitario: 0,
        referencia_compra: '',
        es_credito: false,
        dias_credito: 30,
        fecha_esperada_entrega: '',
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
      proveedor_id: '',
      costo_unitario: 0,
      referencia_compra: '',
      es_credito: false,
      dias_credito: 30,
      fecha_esperada_entrega: '',
    });
    setMovementType('entrada');
  };

  const handleProveedorChange = (proveedorId: string) => {
    setFormData({ ...formData, proveedor_id: proveedorId });

    // Si hay un proveedor seleccionado, obtener días de crédito por defecto
    if (proveedorId) {
      const proveedor = proveedores.find(p => p.id === parseInt(proveedorId));
      if (proveedor && proveedor.dias_credito_default) {
        setFormData(prev => ({
          ...prev,
          proveedor_id: proveedorId,
          dias_credito: proveedor.dias_credito_default
        }));
      }
    }
  };

  const stockResultante = (insumo.stock_actual || 0) + (movementType === 'salida' ? -Math.abs(formData.cantidad) : Math.abs(formData.cantidad));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
            Ajustar Stock
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Insumo Info */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{insumo.nombre}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Stock Actual:</span> {insumo.stock_actual || 0} {insumo.unidad_medida}
              </div>
              <div>
                <span className="font-medium">Costo Unitario:</span> {formatCurrency(insumo.costo_unitario || 0)}
              </div>
              <div>
                <span className="font-medium">Stock Mínimo:</span> {insumo.stock_minimo || 0} {insumo.unidad_medida}
              </div>
              <div>
                <span className="font-medium">Unidad:</span> {insumo.unidad_medida}
              </div>
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
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-300'
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  min="0.001"
                  step="0.001"
                  value={formData.cantidad || ''}
                  onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.000"
                  required
                />
                <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                  {insumo.unidad_medida}
                </span>
              </div>
            </div>

            {/* Campos adicionales para Compras */}
            {formData.tipo_movimiento === 'compra' && (
              <>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Información de Compra
                  </h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proveedor *
                  </label>
                  <select
                    value={formData.proveedor_id}
                    onChange={(e) => handleProveedorChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Costo Unitario *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formData.costo_unitario || ''}
                        onChange={(e) => setFormData({ ...formData, costo_unitario: Number(e.target.value) })}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referencia / Factura
                    </label>
                    <input
                      type="text"
                      value={formData.referencia_compra}
                      onChange={(e) => setFormData({ ...formData, referencia_compra: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="# Factura"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.es_credito}
                      onChange={(e) => setFormData({ ...formData, es_credito: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Compra a Crédito (generar cuenta por pagar)
                    </span>
                  </label>
                </div>

                {formData.es_credito && (
                  <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-blue-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Días de Crédito
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.dias_credito}
                        onChange={(e) => setFormData({ ...formData, dias_credito: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha Esperada de Entrega
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={formData.fecha_esperada_entrega}
                          onChange={(e) => setFormData({ ...formData, fecha_esperada_entrega: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.cantidad > 0 && formData.costo_unitario > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Costo Total de Compra:</span>
                      <span className="text-lg font-bold text-green-900">
                        {formatCurrency(formData.costo_unitario * formData.cantidad)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas / Comentarios
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detalles adicionales del movimiento..."
              />
            </div>
          </div>

          {/* Stock Preview */}
          {formData.cantidad > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Resumen del Movimiento</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Stock Actual:</span>
                  <div className="font-semibold">{insumo.stock_actual || 0} {insumo.unidad_medida}</div>
                </div>
                <div>
                  <span className="text-gray-600">Movimiento:</span>
                  <div className={`font-semibold ${movementType === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {movementType === 'entrada' ? '+' : '-'}{formData.cantidad} {insumo.unidad_medida}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Stock Resultante:</span>
                  <div className={`font-semibold ${stockResultante < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stockResultante} {insumo.unidad_medida}
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
              
              {stockResultante <= (insumo.stock_minimo || 0) && stockResultante >= 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-700">
                    ⚠️ El stock resultante estará por debajo del mínimo ({insumo.stock_minimo} {insumo.unidad_medida}).
                  </span>
                </div>
              )}

              {formData.cantidad > 0 && (insumo.costo_unitario || 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Valor del movimiento:</span>
                    <span className="font-semibold text-blue-900">
                      {formatCurrency((insumo.costo_unitario || 0) * formData.cantidad)}
                    </span>
                  </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}