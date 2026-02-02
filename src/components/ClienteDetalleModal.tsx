import React, { useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, FileText, CreditCard, DollarSign } from 'lucide-react';
import { useClientesStore } from '../lib/store/clientesStore';
import { MetricasCliente } from './MetricasCliente';
import { formatCurrency } from '../lib/utils/formatters';

interface ClienteDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
}

export function ClienteDetalleModal({ isOpen, onClose, clienteId }: ClienteDetalleModalProps) {
  const { clienteActual, isLoading, fetchClienteById, clearClienteActual } = useClientesStore();

  useEffect(() => {
    if (isOpen && clienteId) {
      fetchClienteById(clienteId);
    }
    
    return () => {
      if (!isOpen) {
        clearClienteActual();
      }
    };
  }, [isOpen, clienteId, fetchClienteById, clearClienteActual]);

  if (!isOpen) return null;

  const getSaldoStatus = (saldo: number) => {
    if (saldo > 0) return { text: 'Cliente debe', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (saldo < 0) return { text: 'Saldo a favor', color: 'text-green-600', bgColor: 'bg-green-50' };
    return { text: 'Al día', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  const saldoStatus = getSaldoStatus(clienteActual?.saldo_actual || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Detalles del Cliente
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando información del cliente...</span>
            </div>
          ) : !clienteActual ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Cliente no encontrado</h3>
              <p className="text-gray-500">No se pudo cargar la información del cliente.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Métricas de CRM y Fidelización */}
              <MetricasCliente clienteId={clienteId} />

              {/* Información Básica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Información Básica
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo
                    </label>
                    <p className="text-gray-900 font-medium">
                      {clienteActual.nombre || 'No especificado'}
                    </p>
                  </div>

                  {clienteActual.numero_identificacion && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        N° Identificación
                      </label>
                      <p className="text-gray-900">
                        {clienteActual.numero_identificacion}
                      </p>
                    </div>
                  )}

                  {clienteActual.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <p className="text-gray-900">{clienteActual.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Contacto */}
              {(clienteActual.telefono || clienteActual.telefono_secundario || clienteActual.direccion) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Información de Contacto
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clienteActual.telefono && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono Principal
                        </label>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-gray-900">{clienteActual.telefono}</p>
                        </div>
                      </div>
                    )}

                    {clienteActual.telefono_secundario && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono Secundario
                        </label>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-gray-900">{clienteActual.telefono_secundario}</p>
                        </div>
                      </div>
                    )}

                    {clienteActual.direccion && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección
                        </label>
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                          <p className="text-gray-900">
                            {typeof clienteActual.direccion === 'string' 
                              ? clienteActual.direccion 
                              : JSON.stringify(clienteActual.direccion)
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {clienteActual.plus_code && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plus Code de Google
                        </label>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-gray-900 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {clienteActual.plus_code}
                          </p>
                        </div>
                      </div>
                    )}

                    {clienteActual.referencias && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Referencias de Ubicación
                        </label>
                        <p className="text-gray-900 text-sm">
                          {clienteActual.referencias}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información de Cuenta */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Información de Cuenta
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ventas a Crédito
                    </label>
                    <div className="flex items-center">
                      {clienteActual.permite_credito ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CreditCard className="w-3 h-3 mr-1" />
                          Habilitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Deshabilitado
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Saldo Actual
                    </label>
                    <div className={`p-3 rounded-lg ${saldoStatus.bgColor}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold ${saldoStatus.color}`}>
                          {formatCurrency(Math.abs(clienteActual.saldo_actual || 0))}
                        </span>
                        <span className={`text-sm ${saldoStatus.color}`}>
                          {saldoStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {clienteActual.observaciones && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Observaciones
                  </h3>
                  <p className="text-gray-900 text-sm leading-relaxed">
                    {clienteActual.observaciones}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}