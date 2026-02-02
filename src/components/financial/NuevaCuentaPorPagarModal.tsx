import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useProveedoresStore } from '../../lib/store/proveedoresStore';
import { useCuentasPorPagarStore } from '../../lib/store/cuentasPorPagarStore';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

export function NuevaCuentaPorPagarModal({ onClose }: Props) {
  const { proveedores, fetchProveedores } = useProveedoresStore();
  const { createCuenta } = useCuentasPorPagarStore();

  const [formData, setFormData] = useState({
    proveedor_id: '',
    monto_total: '',
    fecha_vencimiento: '',
    referencia_compra: '',
    notas: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProveedores();
    const hoy = new Date();
    const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormData(prev => ({
      ...prev,
      fecha_vencimiento: en30Dias.toISOString().split('T')[0]
    }));
  }, [fetchProveedores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.proveedor_id || !formData.monto_total || !formData.fecha_vencimiento) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCuenta({
        proveedor_id: parseInt(formData.proveedor_id),
        monto_total: parseFloat(formData.monto_total),
        monto_pagado: 0,
        saldo_pendiente: parseFloat(formData.monto_total),
        fecha_vencimiento: formData.fecha_vencimiento,
        estatus: 'pendiente',
        referencia_compra: formData.referencia_compra || undefined,
        notas: formData.notas || undefined,
      });
      toast.success('Cuenta por pagar creada exitosamente');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Nueva Cuenta por Pagar</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.proveedor_id}
              onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monto Total <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.monto_total}
              onChange={(e) => setFormData({ ...formData, monto_total: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Vencimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha_vencimiento}
              onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referencia de Compra
            </label>
            <input
              type="text"
              value={formData.referencia_compra}
              onChange={(e) => setFormData({ ...formData, referencia_compra: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Factura #12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Información adicional..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
