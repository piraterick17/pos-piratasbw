import React, { useState, useEffect } from 'react';
import { X, Search, User, Phone, Plus } from 'lucide-react';
import { useCartStore } from '../lib/store/cartStore';
import { useClientesStore } from '../lib/store/clientesStore';
import { ClienteForm } from './ClienteForm';
import { supabase } from '../lib/supabase/client';

interface ClienteSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  clientes: any[];
  onClienteSelect?: (cliente: any) => void;
}

export function ClienteSelector({ isOpen, onClose, clientes, onClienteSelect }: ClienteSelectorProps) {
  const { clienteSeleccionado, setClienteSeleccionado } = useCartStore();
  const { fetchClientes } = useClientesStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isClienteFormOpen, setIsClienteFormOpen] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchClientes = async () => {
      if (!isOpen) return;

      if (!searchTerm || searchTerm.trim().length === 0) {
        setFilteredClientes([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchPattern = `%${searchTerm}%`;

        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .is('deleted_at', null)
          .or(`nombre.ilike.${searchPattern},telefono.ilike.${searchPattern},email.ilike.${searchPattern}`)
          .order('nombre', { ascending: true })
          .limit(100);

        if (error) {
          console.error('Error en consulta Supabase:', error);
          throw error;
        }

        console.log('Clientes encontrados:', data?.length || 0);
        setFilteredClientes(data || []);
      } catch (error) {
        console.error('Error buscando clientes:', error);
        setFilteredClientes([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(() => {
      searchClientes();
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, isOpen]);

  const handleSelectCliente = (cliente: any) => {
    if (onClienteSelect) {
      onClienteSelect(cliente);
    } else {
      setClienteSeleccionado(cliente);
    }
    onClose();
  };

  const handleClearSelection = () => {
    if (onClienteSelect) {
      onClienteSelect(null);
    } else {
      setClienteSeleccionado(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-pirateRed to-pirateRedDark">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-boneWhite" />
              Seleccionar Cliente
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-boneWhite"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search and Actions */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex space-x-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nombre, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setIsClienteFormOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo
              </button>
            </div>

            {/* Current Selection */}
            {(clienteSeleccionado || onClienteSelect) && (
              <div className="mt-4 p-3 bg-pirateRed bg-opacity-10 border border-pirateRed border-opacity-30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pirateRedDark">Cliente Actual:</p>
                    <p className="text-pirateRed font-semibold">{clienteSeleccionado?.nombre || 'Ninguno seleccionado'}</p>
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="text-sm text-pirateRed hover:text-pirateRedDark font-medium"
                  >
                    Quitar selección
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clientes List */}
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {isSearching ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pirateRed mx-auto mb-4"></div>
                <p className="text-gray-500">Buscando clientes...</p>
              </div>
            ) : !searchTerm ? (
              <div className="p-6 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Buscar Cliente
                </h3>
                <p className="text-gray-500 mb-4">
                  Escribe el nombre, teléfono o email del cliente para buscarlo
                </p>
                <button
                  onClick={() => setIsClienteFormOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Cliente Nuevo
                </button>
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-6 text-center">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron clientes
                </h3>
                <p className="text-gray-500 mb-4">
                  No hay clientes que coincidan con "{searchTerm}"
                </p>
                <button
                  onClick={() => setIsClienteFormOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Cliente
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {/* Opción para venta sin cliente */}
                <button
                  onClick={() => handleSelectCliente(null)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Venta sin cliente</div>
                      <div className="text-sm text-gray-500">Venta al público general</div>
                    </div>
                  </div>
                </button>

                {filteredClientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => handleSelectCliente(cliente)}
                    className={`w-full p-4 text-left hover:bg-pirateRed hover:bg-opacity-5 transition-colors ${
                      clienteSeleccionado?.id === cliente.id ? 'bg-pirateRed bg-opacity-10 border-l-4 border-pirateRed' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-pirateRed bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-pirateRed" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-pirateRedDark">
                          {cliente.nombre || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500 space-x-2">
                          {cliente.telefono && (
                            <span className="inline-flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {cliente.telefono}
                            </span>
                          )}
                          {cliente.email && (
                            <span>{cliente.email}</span>
                          )}
                        </div>
                      </div>
                      {clienteSeleccionado?.id === cliente.id && (
                        <div className="text-pirateRed text-sm font-bold">
                          Seleccionado
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cliente Form Modal */}
<ClienteForm
        isOpen={isClienteFormOpen}
        onClose={() => setIsClienteFormOpen(false)}
        onSuccess={(nuevoCliente: any) => { // Aceptamos el nuevo cliente
          fetchClientes(); // Refrescamos la lista global
          setIsClienteFormOpen(false); // Cerramos el formulario
          
          // ¡MAGIA! Si recibimos el cliente nuevo, lo seleccionamos automáticamente
          if (nuevoCliente && nuevoCliente.id) {
            handleSelectCliente(nuevoCliente);
          }
        }}
      />
    </>
  );
}