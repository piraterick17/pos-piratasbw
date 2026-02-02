import React, { useState, useEffect } from 'react';
import { X, User, DollarSign, Check, AlertCircle } from 'lucide-react';
import { useProveedoresStore, type Proveedor, type ProveedorInsumo } from '../lib/store/proveedoresStore';
import { formatCurrency } from '../lib/utils/formatters';

interface AsignarProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumoId: number;
  insumoNombre: string;
  costoActual: number;
  onSuccess?: () => void;
  proveedorInsumo?: ProveedorInsumo | null;
}

export function AsignarProveedorModal({ 
  isOpen, 
  onClose, 
  insumoId, 
  insumoNombre,
  costoActual,
  onSuccess,
  proveedorInsumo
}: AsignarProveedorModalProps) {
  const { 
    proveedores, 
    fetchProveedores, 
    asignarProveedorAInsumo, 
    actualizarProveedorInsumo,
    isSubmitting 
  } = useProveedoresStore();
  
  const [formData, setFormData] = useState({
    proveedor_id: 0,
    costo_especifico: 0,
    es_proveedor_activo: false,
  });

  const isEditing = !!proveedorInsumo;

  useEffect(() => {
    if (isOpen) {
      fetchProveedores();
      
      if (proveedorInsumo) {
        setFormData({
          proveedor_id: proveedorInsumo.proveedor_id,
          costo_especifico: proveedorInsumo.costo_especifico,
          es_proveedor_activo: proveedorInsumo.es_proveedor_activo,
        });
      } else {
        setFormData({
          proveedor_id: 0,
          costo_especifico: costoActual || 0,
          es_proveedor_activo: false,
        });
      }
    }
  }, [isOpen, proveedorInsumo, costoActual, fetchProveedores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.proveedor_id || formData.costo_especifico <= 0) {
      return;
    }

    try {
      const data = {
        proveedor_id: formData.proveedor_id,
        insumo_id: insumoId,
        costo_especifico: formData.costo_especifico,
        es_proveedor_activo: formData.es_proveedor_activo,
      };
      
      if (isEditing) {
        await actualizarProveedorInsumo(data);
      } else {
        await asignarProveedorAInsumo(data);
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      proveedor_id: 0,
      costo_especifico: 0,
      es_proveedor_activo: false,
    });
  };

  const selectedProveedor = proveedores.find(p => p.id === formData.proveedor_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            {isEditing ? 'Editar Proveedor' : 'Asignar Proveedor'}
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
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Insumo</h3>
            <p className="text-blue-800 font-medium">{insumoNombre}</p>
            <p className="text-sm text-blue-700 mt-1">
              Costo actual: {formatCurrency(costoActual)}
            </p>
          </div>

          {/* Proveedor Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor *
            </label>
            <select
              value={formData.proveedor_id || ''}
              onChange={(e) => setFormData({ ...formData, proveedor_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isEditing}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                No se puede cambiar el proveedor en modo edición
              </p>
            )}
          </div>

          {/* Costo Específico */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Costo Específico *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.costo_especifico || ''}
                onChange={(e) => setFormData({ ...formData, costo_especifico: Number(e.target.value) })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Costo por unidad de este insumo con este proveedor
            </p>
          </div>

          {/* Es Proveedor Activo */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Establecer como Proveedor Activo
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, es_proveedor_activo: !formData.es_proveedor_activo })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.es_proveedor_activo ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.es_proveedor_activo ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Si se activa, el costo de este proveedor se usará como costo unitario del insumo
            </p>
          </div>

          {/* Proveedor Preview */}
          {selectedProveedor && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center mb-2">
                <User className="w-4 h-4 text-gray-600 mr-2" />
                <h4 className="font-semibold text-gray-900">Información del Proveedor</h4>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Nombre:</span> {selectedProveedor.nombre}</p>
                {selectedProveedor.contacto_nombre && (
                  <p><span className="text-gray-600">Contacto:</span> {selectedProveedor.contacto_nombre}</p>
                )}
                {selectedProveedor.telefono && (
                  <p><span className="text-gray-600">Teléfono:</span> {selectedProveedor.telefono}</p>
                )}
                {selectedProveedor.email && (
                  <p><span className="text-gray-600">Email:</span> {selectedProveedor.email}</p>
                )}
              </div>
            </div>
          )}

          {/* Proveedor Activo Warning */}
          {formData.es_proveedor_activo && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Atención</h4>
                  <p className="text-sm text-yellow-700">
                    Al marcar este proveedor como activo, el costo unitario del insumo se actualizará a {formatCurrency(formData.costo_especifico)}.
                  </p>
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
              disabled={isSubmitting || !formData.proveedor_id || formData.costo_especifico <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Check className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Asignar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}