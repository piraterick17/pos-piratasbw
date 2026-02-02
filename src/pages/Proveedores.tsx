import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  FileText,
  User,
  Eye
} from 'lucide-react';
import { useProveedoresStore, type Proveedor } from '../lib/store/proveedoresStore';
import { ProveedorFormModal } from '../components/ProveedorFormModal';
import { ProveedorDetalleModal } from '../components/ProveedorDetalleModal';

export function Proveedores() {
  const { 
    proveedores, 
    isLoading, 
    fetchProveedores, 
    deleteProveedor 
  } = useProveedoresStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [isDetalleOpen, setIsDetalleOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const filteredProveedores = proveedores.filter(proveedor => {
    const searchLower = searchTerm.toLowerCase();
    return (
      proveedor.nombre.toLowerCase().includes(searchLower) ||
      proveedor.contacto_nombre?.toLowerCase().includes(searchLower) ||
      proveedor.telefono?.toLowerCase().includes(searchLower) ||
      proveedor.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (proveedor: Proveedor) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a "${proveedor.nombre}"?`)) {
      try {
        await deleteProveedor(proveedor.id!);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProveedor(null);
  };

  const handleViewDetalle = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setIsDetalleOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 pb-0">
      {/* Header Actions */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="w-8 h-8 mr-3 text-blue-600" />
          Proveedores
        </h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Nuevo Proveedor</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar proveedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="text-sm text-gray-500 flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {filteredProveedores.length} proveedores
          </div>
        </div>
      </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4">
      {/* Proveedores List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando proveedores...</span>
        </div>
      ) : filteredProveedores.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proveedores</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'No se encontraron proveedores con los criterios de búsqueda.' : 'Comienza registrando tu primer proveedor.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Proveedor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProveedores.map((proveedor) => (
            <div 
              key={proveedor.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                {/* Proveedor Info */}
                <div className="flex items-start md:items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {proveedor.nombre}
                        </h3>
                        {proveedor.contacto_nombre && (
                          <p className="text-sm text-gray-500 mt-1">
                            Contacto: {proveedor.contacto_nombre}
                          </p>
                        )}
                      </div>
                      
                      {/* Contact Info */}
                      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mt-2 md:mt-0">
                        {proveedor.telefono && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{proveedor.telefono}</span>
                          </div>
                        )}
                        {proveedor.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{proveedor.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dirección y Notas */}
                    <div className="mt-2 space-y-1">
                      {proveedor.direccion && (
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{proveedor.direccion}</span>
                        </div>
                      )}
                      {proveedor.notas && (
                        <div className="flex items-start text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{proveedor.notas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleViewDetalle(proveedor)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Ver Detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleEdit(proveedor)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(proveedor)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Proveedor Form Modal */}
      <ProveedorFormModal
        isOpen={isFormOpen}
        onClose={handleFormClose}
        proveedor={editingProveedor}
        onSuccess={() => {
          fetchProveedores();
        }}
      />

      {/* Proveedor Detalle Modal */}
      <ProveedorDetalleModal
        isOpen={isDetalleOpen}
        onClose={() => {
          setIsDetalleOpen(false);
          setSelectedProveedor(null);
        }}
        proveedor={selectedProveedor}
      />
    </div>
  );
}