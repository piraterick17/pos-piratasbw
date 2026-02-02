import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, User } from 'lucide-react';
import { useCartStore } from '../lib/store/cartStore';
import { ClienteForm } from './ClienteForm';
import { supabase } from '../lib/supabase/client';

interface ClienteSelectorInlineProps {
  clientes: any[];
  onClienteSelect?: (cliente: any) => void;
}

export function ClienteSelectorInline({ clientes, onClienteSelect }: ClienteSelectorInlineProps) {
  const { clienteSeleccionado, setClienteSeleccionado } = useCartStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredClientes, setFilteredClientes] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isClienteFormOpen, setIsClienteFormOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const searchClientes = async () => {
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
          .limit(50);

        if (error) throw error;
        setFilteredClientes(data || []);
      } catch (error) {
        console.error('Error searching clientes:', error);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectCliente = (cliente: any) => {
    if (onClienteSelect) {
      onClienteSelect(cliente);
    } else {
      setClienteSeleccionado(cliente);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClienteSelect) {
      onClienteSelect(null);
    } else {
      setClienteSeleccionado(null);
    }
    setSearchTerm('');
  };

  const displayCliente = onClienteSelect ? clienteSeleccionado : clienteSeleccionado;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <label className="text-xs font-medium text-gray-700 flex items-center mb-1">
          <User className="w-3 h-3 mr-1" />
          Cliente
        </label>

        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2 w-3 h-3 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder={displayCliente ? displayCliente.nombre : 'Buscar cliente...'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
            />
          </div>

          {displayCliente && (
            <button
              onClick={handleClearSelection}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Quitar cliente"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setIsClienteFormOpen(true)}
            className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
            title="Crear nuevo cliente"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {isSearching ? (
              <div className="p-2 text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pirateRed mx-auto"></div>
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-2 text-center text-xs text-gray-500">
                {searchTerm ? 'No se encontraron clientes' : 'Empieza a buscar...'}
              </div>
            ) : (
              filteredClientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => handleSelectCliente(cliente)}
                  className="w-full text-left px-3 py-2 hover:bg-pirateRed hover:text-white transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-xs font-medium">{cliente.nombre}</div>
                  <div className="text-[10px] text-gray-500">
                    {cliente.telefono && <span>{cliente.telefono}</span>}
                    {cliente.saldo_credito !== undefined && (
                      <span className="ml-2">Crédito: ${cliente.saldo_credito.toFixed(0)}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {displayCliente && (
          <div className="mt-1 p-2 bg-pirateRed bg-opacity-10 border border-pirateRed border-opacity-30 rounded text-xs">
            <p className="font-semibold text-pirateRed">{displayCliente.nombre}</p>
            {displayCliente.telefono && (
              <p className="text-gray-600 text-[10px]">📞 {displayCliente.telefono}</p>
            )}
            {displayCliente.saldo_credito !== undefined && displayCliente.saldo_credito > 0 && (
              <p className="text-green-700 text-[10px]">Crédito: ${displayCliente.saldo_credito.toFixed(2)}</p>
            )}
          </div>
        )}
      </div>

      {isClienteFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-pirateRed to-pirateRedDark">
              <h2 className="text-xl font-bold text-boneWhite">Crear Nuevo Cliente</h2>
              <button
                onClick={() => setIsClienteFormOpen(false)}
                className="text-boneWhite hover:bg-white/20 p-2 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ClienteForm
                onSuccess={() => {
                  setIsClienteFormOpen(false);
                  setSearchTerm('');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
