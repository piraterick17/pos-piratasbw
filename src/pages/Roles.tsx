import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Check,
  Search,
  AlertCircle,
  User,
  FileText
} from 'lucide-react';
import { useRolesStore, type Rol, type Permiso } from '../lib/store/rolesStore';
import toast from 'react-hot-toast';

export function Roles() {
  const { 
    roles, 
    permisos, 
    isLoading, 
    isSubmitting,
    fetchRolesConPermisos, 
    fetchPermisosDisponibles,
    createRol,
    updateRol,
    deleteRol,
    updateRolPermisos
  } = useRolesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingRol, setIsCreatingRol] = useState(false);
  const [newRolData, setNewRolData] = useState({ nombre: '', descripcion: '' });
  const [editingRolId, setEditingRolId] = useState<string | null>(null);
  const [editingRolData, setEditingRolData] = useState({ nombre: '', descripcion: '' });
  const [editingPermisosRolId, setEditingPermisosRolId] = useState<string | null>(null);
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>([]);
  const [searchPermisoTerm, setSearchPermisoTerm] = useState('');
  const [permisosCategories, setPermisosCategories] = useState<Record<string, Permiso[]>>({});

  useEffect(() => {
    fetchRolesConPermisos();
    fetchPermisosDisponibles();
  }, [fetchRolesConPermisos, fetchPermisosDisponibles]);

  // Organizar permisos por categorías
  useEffect(() => {
    if (permisos.length > 0) {
      const categories: Record<string, Permiso[]> = {};
      
      permisos.forEach(permiso => {
        // Extraer la categoría del nombre del permiso (ej: "dashboard.ver" -> "dashboard")
        const category = permiso.nombre.split('.')[0];
        
        if (!categories[category]) {
          categories[category] = [];
        }
        
        categories[category].push(permiso);
      });
      
      setPermisosCategories(categories);
    }
  }, [permisos]);

  const filteredRoles = roles.filter(rol => 
    rol.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rol.descripcion && rol.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateRol = async () => {
    if (!newRolData.nombre.trim()) {
      toast.error('El nombre del rol es obligatorio');
      return;
    }

    try {
      await createRol(
        newRolData.nombre.trim(),
        newRolData.descripcion.trim() || undefined
      );
      setIsCreatingRol(false);
      setNewRolData({ nombre: '', descripcion: '' });
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleUpdateRol = async () => {
    if (!editingRolId || !editingRolData.nombre.trim()) {
      toast.error('El nombre del rol es obligatorio');
      return;
    }

    try {
      await updateRol(
        editingRolId,
        editingRolData.nombre.trim(),
        editingRolData.descripcion.trim() || undefined
      );
      setEditingRolId(null);
      setEditingRolData({ nombre: '', descripcion: '' });
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleDeleteRol = async (rol: Rol) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el rol "${rol.nombre}"?`)) {
      try {
        await deleteRol(rol.id);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleEditRol = (rol: Rol) => {
    setEditingRolId(rol.id);
    setEditingRolData({
      nombre: rol.nombre,
      descripcion: rol.descripcion || ''
    });
  };

  const handleCancelEditRol = () => {
    setEditingRolId(null);
    setEditingRolData({ nombre: '', descripcion: '' });
  };

  const handleEditPermisos = (rol: Rol) => {
    setEditingPermisosRolId(rol.id);
    setSelectedPermisos(rol.permisos?.map(p => p.id) || []);
  };

  const handleSavePermisos = async () => {
    if (!editingPermisosRolId) return;

    try {
      await updateRolPermisos(editingPermisosRolId, selectedPermisos);
      setEditingPermisosRolId(null);
      setSelectedPermisos([]);
      setSearchPermisoTerm('');
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleCancelEditPermisos = () => {
    setEditingPermisosRolId(null);
    setSelectedPermisos([]);
    setSearchPermisoTerm('');
  };

  const togglePermiso = (permisoId: string) => {
    if (selectedPermisos.includes(permisoId)) {
      setSelectedPermisos(selectedPermisos.filter(id => id !== permisoId));
    } else {
      setSelectedPermisos([...selectedPermisos, permisoId]);
    }
  };

  const filteredPermisos = permisos.filter(permiso => 
    permiso.nombre.toLowerCase().includes(searchPermisoTerm.toLowerCase()) ||
    (permiso.descripcion && permiso.descripcion.toLowerCase().includes(searchPermisoTerm.toLowerCase()))
  );

  const getPermisoCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'dashboard': 'Dashboard',
      'reportes': 'Reportes',
      'pedidos': 'Pedidos',
      'productos': 'Productos',
      'categorias': 'Categorías',
      'clientes': 'Clientes',
      'insumos': 'Insumos',
      'proveedores': 'Proveedores',
      'recetas': 'Recetas',
      'mermas': 'Mermas',
      'stock': 'Stock',
      'envios': 'Envíos',
      'roles': 'Roles',
      'usuarios': 'Usuarios',
      'kds': 'Cocina (KDS)'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 pb-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="w-8 h-8 mr-3 text-blue-600" />
          Roles y Permisos
        </h1>
        <button
          onClick={() => setIsCreatingRol(true)}
          className="inline-flex items-center px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Nuevo Rol</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="text-sm text-gray-500 flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            {roles.length} roles
          </div>
        </div>
      </div>

      {/* Crear Nuevo Rol */}
      {isCreatingRol && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              Crear Nuevo Rol
            </h2>
            <button
              onClick={() => {
                setIsCreatingRol(false);
                setNewRolData({ nombre: '', descripcion: '' });
              }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Rol *
              </label>
              <input
                type="text"
                value={newRolData.nombre}
                onChange={(e) => setNewRolData({ ...newRolData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Vendedor, Cocinero, etc."
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={newRolData.descripcion}
                onChange={(e) => setNewRolData({ ...newRolData, descripcion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción del rol (opcional)"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setIsCreatingRol(false);
                setNewRolData({ nombre: '', descripcion: '' });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateRol}
              disabled={isSubmitting || !newRolData.nombre.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {isSubmitting ? 'Guardando...' : 'Guardar Rol'}
            </button>
          </div>
        </div>
      )}
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4">
      {/* Lista de Roles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando roles...</span>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay roles</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'No se encontraron roles con los criterios de búsqueda.' : 'Comienza creando tu primer rol.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setIsCreatingRol(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Rol
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRoles.map((rol) => (
            <div 
              key={rol.id} 
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow ${
                editingPermisosRolId === rol.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {editingRolId === rol.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Rol *
                      </label>
                      <input
                        type="text"
                        value={editingRolData.nombre}
                        onChange={(e) => setEditingRolData({ ...editingRolData, nombre: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej: Vendedor, Cocinero, etc."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={editingRolData.descripcion}
                        onChange={(e) => setEditingRolData({ ...editingRolData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descripción del rol (opcional)"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleCancelEditRol}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleUpdateRol}
                      disabled={isSubmitting || !editingRolData.nombre.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2 inline" />
                      {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              ) : editingPermisosRolId === rol.id ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-blue-600" />
                      Permisos para: {rol.nombre}
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelEditPermisos}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar permisos..."
                      value={searchPermisoTerm}
                      onChange={(e) => setSearchPermisoTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {searchPermisoTerm ? (
                    <div className="space-y-2">
                      {filteredPermisos.map(permiso => (
                        <div 
                          key={permiso.id} 
                          className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            id={`permiso-${permiso.id}`}
                            checked={selectedPermisos.includes(permiso.id)}
                            onChange={() => togglePermiso(permiso.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`permiso-${permiso.id}`} className="ml-2 flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900">{permiso.nombre}</div>
                            {permiso.descripcion && (
                              <div className="text-sm text-gray-500">{permiso.descripcion}</div>
                            )}
                          </label>
                        </div>
                      ))}
                      
                      {filteredPermisos.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No se encontraron permisos con ese término
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(permisosCategories).map(([category, categoryPermisos]) => (
                        <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700">
                            {getPermisoCategoryName(category)}
                          </div>
                          <div className="divide-y divide-gray-200">
                            {categoryPermisos.map(permiso => (
                              <div 
                                key={permiso.id} 
                                className="flex items-center p-3 hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  id={`permiso-${permiso.id}`}
                                  checked={selectedPermisos.includes(permiso.id)}
                                  onChange={() => togglePermiso(permiso.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`permiso-${permiso.id}`} className="ml-2 flex-1 cursor-pointer">
                                  <div className="font-medium text-gray-900">{permiso.nombre.split('.').slice(1).join('.')}</div>
                                  {permiso.descripcion && (
                                    <div className="text-sm text-gray-500">{permiso.descripcion}</div>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCancelEditPermisos}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors mr-2"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSavePermisos}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2 inline" />
                      {isSubmitting ? 'Guardando...' : 'Guardar Permisos'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  {/* Rol Info */}
                  <div className="flex items-start md:items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {rol.nombre}
                          </h3>
                          {rol.descripcion && (
                            <p className="text-sm text-gray-500 mt-1">
                              {rol.descripcion}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Permisos */}
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {rol.permisos && rol.permisos.length > 0 ? (
                            rol.permisos.slice(0, 5).map((permiso) => (
                              <span 
                                key={permiso.id} 
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                title={permiso.descripcion}
                              >
                                {permiso.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">Sin permisos asignados</span>
                          )}
                          
                          {rol.permisos && rol.permisos.length > 5 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{rol.permisos.length - 5} más
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleEditRol(rol)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Rol"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleEditPermisos(rol)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Editar Permisos"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteRol(rol)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Rol"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Información sobre Roles y Permisos */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">Acerca de Roles y Permisos</h3>
            <p className="text-blue-700 mb-3">
              Los roles definen qué acciones pueden realizar los usuarios en el sistema. Cada rol puede tener múltiples permisos asignados.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Roles Predefinidos:</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li><strong>Admin:</strong> Acceso completo a todas las funciones</li>
                  <li><strong>Usuario:</strong> Acceso básico al sistema</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Gestión de Permisos:</h4>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Haz clic en el icono <Shield className="w-3 h-3 inline" /> para editar los permisos de un rol</li>
                  <li>Los permisos están organizados por categorías para facilitar su gestión</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}