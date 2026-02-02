import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  CreditCard,
  Edit,
  Trash2,
  DollarSign,
  RotateCcw,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import { useClientesStore, type Cliente } from '../lib/store/clientesStore';
import { ClienteForm } from '../components/ClienteForm';
import { CreditMovementModal } from '../components/CreditMovementModal';
import { formatCurrency } from '../lib/utils/formatters';

export function Clientes() {
  const { 
    clientes, 
    isLoading, 
    showDeleted,
    fetchClientes, 
    deleteCliente,
    restoreCliente,
    setShowDeleted
  } = useClientesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedClienteForCredit, setSelectedClienteForCredit] = useState<Cliente | null>(null);
  const [creditMovementType, setCreditMovementType] = useState<'cargo' | 'abono'>('cargo');

  useEffect(() => {
    fetchClientes(showDeleted);
  }, [fetchClientes, showDeleted]);

  const filteredClientes = clientes.filter(cliente => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cliente.nombre?.toLowerCase().includes(searchLower) ||
      cliente.telefono?.toLowerCase().includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.numero_identificacion?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (cliente: Cliente) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a "${cliente.nombre}"?`)) {
      try {
        await deleteCliente(cliente.id!);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleRestore = async (cliente: Cliente) => {
    if (window.confirm(`¿Estás seguro de que quieres restaurar a "${cliente.nombre}"?`)) {
      try {
        await restoreCliente(cliente.id!);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCliente(null);
  };

  const handleCreditMovement = (cliente: Cliente, type: 'cargo' | 'abono') => {
    setSelectedClienteForCredit(cliente);
    setCreditMovementType(type);
    setIsCreditModalOpen(true);
  };

  const getSaldoStatus = (saldo: number) => {
    if (saldo > 0) return { text: 'Debe', color: 'text-red-600 bg-red-50' };
    if (saldo < 0) return { text: 'A favor', color: 'text-green-600 bg-green-50' };
    return { text: 'Al día', color: 'text-gray-600 bg-gray-50' };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 pb-0">
      {/* Header Actions */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Nuevo Cliente</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between md:justify-end space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showDeleted"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showDeleted" className="ml-2 text-sm text-gray-700 flex items-center">
                {showDeleted ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">Mostrar eliminados</span>
                <span className="sm:hidden">Eliminados</span>
              </label>
            </div>
            
            <div className="text-sm text-gray-500 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {filteredClientes.length}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4">
      {/* Clients List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando clientes...</span>
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'No se encontraron clientes con los criterios de búsqueda.' : 'Comienza registrando tu primer cliente.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClientes.map((cliente) => {
            const saldoStatus = getSaldoStatus(cliente.saldo_actual || 0);
            const isDeleted = !!cliente.deleted_at;
            
            return (
              <div 
                key={cliente.id} 
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow ${
                  isDeleted ? 'bg-red-50 opacity-75' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  {/* Client Info */}
                  <div className="flex items-start md:items-center space-x-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDeleted ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <User className={`w-6 h-6 ${isDeleted ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-semibold truncate ${isDeleted ? 'text-red-900' : 'text-gray-900'}`}>
                            {cliente.nombre || 'Sin nombre'}
                            {isDeleted && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Eliminado
                              </span>
                            )}
                          </h3>
                          {cliente.numero_identificacion && (
                            <p className="text-sm text-gray-500 mt-1">
                              ID: {cliente.numero_identificacion}
                            </p>
                          )}
                        </div>
                        
                        {/* Contact Info */}
                        <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-2 md:mt-0">
                          {cliente.telefono && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{cliente.telefono}</span>
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span className="truncate">{cliente.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credit and Balance Info */}
                  <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-6">
                    {/* Credit Status */}
                    <div className="flex items-center justify-between md:justify-start">
                      <span className="text-sm text-gray-600 md:hidden">Crédito:</span>
                      {cliente.permite_credito ? (
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

                    {/* Balance */}
                    <div className="flex items-center justify-between md:justify-start">
                      <span className="text-sm text-gray-600 md:hidden">Saldo:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${saldoStatus.color}`}>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(Math.abs(cliente.saldo_actual || 0))}
                        </span>
                        <span className="text-xs text-gray-500">
                          {saldoStatus.text}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2">
                      {!isDeleted ? (
                        <>
                          <button
                            onClick={() => handleEdit(cliente)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {cliente.permite_credito && (
                            <>
                              <button
                                onClick={() => handleCreditMovement(cliente, 'cargo')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Añadir Deuda"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleCreditMovement(cliente, 'abono')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Registrar Pago"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => handleDelete(cliente)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(cliente)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Restaurar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Client Form Modal */}
      <ClienteForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        cliente={editingCliente}
        onSuccess={() => {
          fetchClientes(showDeleted);
        }}
      />

      {/* Credit Movement Modal */}
      {selectedClienteForCredit && (
        <CreditMovementModal
          isOpen={isCreditModalOpen}
          onClose={() => {
            setIsCreditModalOpen(false);
            setSelectedClienteForCredit(null);
          }}
          cliente={selectedClienteForCredit}
          movementType={creditMovementType}
        />
      )}
    </div>
  );
}