import React, { useState, useEffect } from 'react';
import { X, MapPin, DollarSign, Gift } from 'lucide-react';
import { usePedidosStore, ZonaEntrega } from '../lib/store/pedidosStore';
import { formatCurrency } from '../lib/utils/formatters';

interface ZonaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  zonaToEdit?: ZonaEntrega | null;
}

export function ZonaFormModal({ isOpen, onClose, zonaToEdit }: ZonaFormModalProps) {
  const { createZona, updateZona, isSubmitting } = usePedidosStore();
  
  const [formData, setFormData] = useState({
    nombre: '',
    costo: '',
    monto_minimo_envio_gratis: '',
    activa: true,
  });

  useEffect(() => {
    if (zonaToEdit) {
      setFormData({
        nombre: zonaToEdit.nombre || '',
        costo: String(zonaToEdit.costo || ''),
        monto_minimo_envio_gratis: String(zonaToEdit.monto_minimo_envio_gratis || ''),
        activa: zonaToEdit.activa !== false,
      });
    } else {
      setFormData({ 
        nombre: '', 
        costo: '', 
        monto_minimo_envio_gratis: '',
        activa: true,
      });
    }
  }, [zonaToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || !formData.costo) {
      return;
    }

    try {
      const dataToSubmit = {
        nombre: formData.nombre.trim(),
        costo: parseFloat(formData.costo),
        monto_minimo_envio_gratis: formData.monto_minimo_envio_gratis 
          ? parseFloat(formData.monto_minimo_envio_gratis) 
          : null,
        activa: formData.activa,
      };

      if (zonaToEdit) {
        await updateZona(zonaToEdit.id, dataToSubmit);
      } else {
        await createZona(dataToSubmit);
      }
      
      onClose();
    } catch (error) {
      // El error ya se muestra con un toast desde el store
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({ 
      nombre: '', 
      costo: '', 
      monto_minimo_envio_gratis: '',
      activa: true,
    });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            {zonaToEdit ? 'Editar' : 'Crear'} Zona de Entrega
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Nombre de la zona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Zona *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Ej: Centro, Zona Norte, Barrio Sur"
                  required 
                />
              </div>
            </div>

            {/* Costo de envío */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Costo de Envío *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.costo} 
                  onChange={e => setFormData({...formData, costo: e.target.value})} 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="0.00"
                  required 
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Costo fijo de envío para esta zona
              </p>
            </div>

            {/* Monto mínimo para envío gratis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto Mínimo para Envío Gratis
              </label>
              <div className="relative">
                <Gift className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={formData.monto_minimo_envio_gratis} 
                  onChange={e => setFormData({...formData, monto_minimo_envio_gratis: e.target.value})} 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Dejar en blanco si no aplica" 
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Si el subtotal supera este monto, el envío será gratuito
              </p>
            </div>

            {/* Estado activo/inactivo */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Zona Activa
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, activa: !formData.activa })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.activa ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.activa ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Preview de configuración */}
            {formData.nombre && formData.costo && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Vista Previa:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Zona:</strong> {formData.nombre}</p>
                  <p><strong>Costo:</strong> {formatCurrency(parseFloat(formData.costo) || 0)}</p>
                  {formData.monto_minimo_envio_gratis && (
                    <p><strong>Envío gratis desde:</strong> {formatCurrency(parseFloat(formData.monto_minimo_envio_gratis))}</p>
                  )}
                  <p><strong>Estado:</strong> {formData.activa ? 'Activa' : 'Inactiva'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <button 
              type="button" 
              onClick={handleClose} 
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Zona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}