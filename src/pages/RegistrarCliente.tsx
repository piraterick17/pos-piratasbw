import React, { useEffect, useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  DollarSign,
  Plus,
  Minus,
  Save,
  ArrowLeft,
  FileText,
  Settings,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';
import { useClientesStore, type Cliente } from '../lib/store/clientesStore';
import { CreditMovementModal } from '../components/CreditMovementModal';
import { formatCurrency } from '../lib/utils/formatters';

interface RegistrarClienteProps {
  clienteId?: string;
}

export function RegistrarCliente({ clienteId }: RegistrarClienteProps) {
  const { 
    clienteActual, 
    isLoading, 
    isSubmitting,
    fetchClienteById, 
    createCliente, 
    updateCliente,
    clearClienteActual
  } = useClientesStore();

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
  });

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditMovementType, setCreditMovementType] = useState<'cargo' | 'abono'>('cargo');

  const isEditing = !!clienteId && clienteId !== 'nuevo';

  useEffect(() => {
    if (isEditing) {
      fetchClienteById(clienteId);
    } else {
      clearClienteActual();
    }
  }, [clienteId, isEditing, fetchClienteById, clearClienteActual]);

  useEffect(() => {
    if (clienteActual && isEditing) {
      setFormData({
        nombre: clienteActual.nombre || '',
        numero_identificacion: clienteActual.numero_identificacion || '',
        telefono: clienteActual.telefono || '',
        telefono_secundario: clienteActual.telefono_secundario || '',
        email: clienteActual.email || '',
        direccion: typeof clienteActual.direccion === 'string' ? clienteActual.direccion : '',
        referencias: clienteActual.referencias || '',
        observaciones: clienteActual.observaciones || '',
        permite_credito: clienteActual.permite_credito || false,
      });
    }
  }, [clienteActual, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      return;
    }

    try {
      if (isEditing) {
        await updateCliente(clienteId, formData);
      } else {
        const nuevoCliente = await createCliente(formData);
        // Navigate to the new client's detail page
        window.location.hash = `#clientes/${nuevoCliente.id}`;
        window.location.reload();
        return;
      }
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleBackToClientes = () => {
    window.location.hash = '#clientes';
    window.location.reload();
  };

  const handleCreditMovement = (type: 'cargo' | 'abono') => {
    setCreditMovementType(type);
    setIsCreditModalOpen(true);
  };

  const getSaldoStatus = (saldo: number) => {
    if (saldo > 0) return { text: 'Cliente debe', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (saldo < 0) return { text: 'Saldo a favor', color: 'text-green-600', bgColor: 'bg-green-50' };
    return { text: 'Al día', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  const saldoStatus = getSaldoStatus(clienteActual?.saldo_actual || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToClientes}
                className="mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Volver a Clientes"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <User className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Modifica la información del cliente' : 'Registra un nuevo cliente'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Información del Cliente
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="md:col-span-2">
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

              <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleBackToClientes}
                  className="mr-3 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Cuenta
              </h3>

              {/* Credit Toggle */}
              <div className="mb-6">
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
              </div>

              {/* Balance Display */}
              {isEditing && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${saldoStatus.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Saldo Actual</span>
                      <span className={`text-lg font-bold ${saldoStatus.color}`}>
                        {formatCurrency(Math.abs(clienteActual?.saldo_actual || 0))}
                      </span>
                    </div>
                    <p className={`text-sm ${saldoStatus.color}`}>
                      {saldoStatus.text}
                    </p>
                  </div>

                  {/* Credit Movement Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleCreditMovement('cargo')}
                      className="inline-flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Añadir Deuda
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreditMovement('abono')}
                      className="inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Registrar Pago
                    </button>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-700">
                      Guarda el cliente para gestionar su cuenta y saldo.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Orders Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Pedidos
              </h3>
              
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  {isEditing 
                    ? 'Este cliente aún no realizó pedidos' 
                    : 'Los pedidos aparecerán aquí una vez creado el cliente'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Movement Modal */}
      {isEditing && clienteActual && (
        <CreditMovementModal
          isOpen={isCreditModalOpen}
          onClose={() => setIsCreditModalOpen(false)}
          cliente={clienteActual}
          movementType={creditMovementType}
        />
      )}
    </div>
  );
}