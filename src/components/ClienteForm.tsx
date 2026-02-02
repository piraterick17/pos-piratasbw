import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, FileText, Save, CreditCard } from 'lucide-react';
import { useClientesStore, type Cliente } from '../lib/store/clientesStore';

interface ClienteFormProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: Cliente | null;
  onSuccess?: () => void;
}

export function ClienteForm({ isOpen, onClose, cliente, onSuccess }: ClienteFormProps) {
  const { createCliente, updateCliente, isSubmitting } = useClientesStore();
  
  const [formData, setFormData] = useState<Cliente>({
    nombre: '',
    numero_identificacion: '',
    telefono: '',
    telefono_secundario: '',
    email: '',
    direccion: '',
    referencias: '',
    observaciones: '',
    permite_credito: false,
    plus_code: '',
  });

  const isEditing = !!cliente?.id;

  useEffect(() => {
    if (cliente && isEditing) {
      setFormData({
        nombre: cliente.nombre || '',
        numero_identificacion: cliente.numero_identificacion || '',
        telefono: cliente.telefono || '',
        telefono_secundario: cliente.telefono_secundario || '',
        email: cliente.email || '',
        direccion: typeof cliente.direccion === 'string' ? cliente.direccion : '',
        referencias: cliente.referencias || '',
        observaciones: cliente.observaciones || '',
        permite_credito: cliente.permite_credito || false,
        plus_code: cliente.plus_code || '',
      });
    } else {
      setFormData({
        nombre: '',
        numero_identificacion: '',
        telefono: '',
        telefono_secundario: '',
        email: '',
        direccion: '',
        referencias: '',
        observaciones: '',
        permite_credito: false,
        plus_code: '',
      });
    }
  }, [cliente, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      return;
    }

    try {
      let resultado; 
      if (isEditing) {
        // Asumimos que update devuelve el cliente, si no, usamos una mezcla
        await updateCliente(cliente.id!, formData);
        resultado = { ...cliente, ...formData };
      } else {
        // createCliente debe devolver el nuevo cliente
        resultado = await createCliente(formData);
      }
      
      // Pasamos el cliente creado/editado al callback de éxito
      onSuccess?.(resultado); 
      onClose();
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      nombre: '',
      numero_identificacion: '',
      telefono: '',
      telefono_secundario: '',
      email: '',
      direccion: '',
      referencias: '',
      observaciones: '',
      permite_credito: false,
      plus_code: '',
    });
  };

  if (!isOpen) return null;

  return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
        style={{ zIndex: 9999 }} // <--- Esto le gana a todo
      >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User className="w-6 h-6 mr-2 text-blue-600" />
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N° Identificación
                  </label>
                  <input
                    type="text"
                    value={formData.numero_identificacion}
                    onChange={(e) => setFormData({ ...formData, numero_identificacion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="DNI, CUIT, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="cliente@email.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Información de Contacto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono Principal
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono Secundario
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telefono_secundario}
                      onChange={(e) => setFormData({ ...formData, telefono_secundario: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Calle, número, ciudad..."
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plus Code de Google (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.plus_code || ''}
                    onChange={(e) => setFormData({ ...formData, plus_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: 8FW4V75V+8Q"
                    pattern="[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}"
                    title="Formato: 8FW4V75V+8Q (código de 6-11 caracteres con signo +)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Para mayor precisión en entregas, puedes obtener el Plus Code desde Google Maps
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencias de Ubicación
                  </label>
                  <textarea
                    value={formData.referencias}
                    onChange={(e) => setFormData({ ...formData, referencias: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Puntos de referencia, indicaciones adicionales..."
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Configuración de Cuenta
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Permitir Ventas a Crédito
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permite_credito: !formData.permite_credito })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.permite_credito ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.permite_credito ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notas adicionales sobre el cliente..."
                  />
                </div>
              </div>
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}