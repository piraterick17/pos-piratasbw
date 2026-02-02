import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Tag, Save, Eye, EyeOff } from 'lucide-react';
import { useProductosStore, type Categoria } from '../lib/store/productosStore';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const { 
    categorias, 
    isSubmitting, 
    fetchCategorias, 
    createCategoria, 
    updateCategoria, 
    deleteCategoria 
  } = useProductosStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingActive, setEditingActive] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
    }
  }, [isOpen, fetchCategorias]);

  const handleEdit = (categoria: Categoria) => {
    setEditingId(categoria.id);
    setEditingName(categoria.nombre);
    setEditingDescription(categoria.descripcion || '');
    setEditingActive(categoria.active !== false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await updateCategoria(editingId, {
        nombre: editingName.trim(),
        descripcion: editingDescription.trim() || undefined,
        active: editingActive,
      });
      setEditingId(null);
      setEditingName('');
      setEditingDescription('');
      setEditingActive(true);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
    setEditingActive(true);
  };

  const handleDelete = async (categoria: Categoria) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoria.nombre}"?`)) {
      try {
        await deleteCategoria(categoria.id);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleCreateNew = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createCategoria({
        nombre: newCategoryName.trim(),
        descripcion: newCategoryDescription.trim() || undefined,
      });
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (error) {
      // Error handling is done in the store
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="bg-gradient-to-r from-pirateRed to-pirateRedDark px-6 py-4 -m-6 mb-0 rounded-t-xl">
            <h2 className="text-2xl font-bold text-boneWhite flex items-center">
              <Tag className="w-6 h-6 mr-2" />
              Gestionar Categorías
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-boneWhite absolute top-4 right-4 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Spacer for header */}
        <div className="bg-gradient-to-r from-pirateRed to-pirateRedDark h-2 -mx-6 -mt-6"></div>

        <div className="p-6">
          {/* Categories List */}
          <div className="space-y-3 mb-6">
            <h3 className="text-lg font-semibold text-pirateRedDark mb-4">Categorías Existentes</h3>
            
            {categorias.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay categorías creadas</p>
              </div>
            ) : (
              categorias.map((categoria) => (
                <div key={categoria.id} className="bg-boneWhite rounded-lg p-4 border border-pirateRed border-opacity-20">
                  {editingId === categoria.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                        placeholder="Nombre de la categoría"
                      />
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                        placeholder="Descripción (opcional)"
                        rows={2}
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-active"
                          checked={editingActive}
                          onChange={(e) => setEditingActive(e.target.checked)}
                          className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                        />
                        <label htmlFor="edit-active" className="text-sm font-medium text-gray-700">
                          Visible en interfaz de venta
                        </label>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSubmitting || !editingName.trim()}
                          className="inline-flex items-center px-3 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-pirateRedDark">{categoria.nombre}</h4>
                          {categoria.active === false ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Oculta
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              <Eye className="w-3 h-3 mr-1" />
                              Visible
                            </span>
                          )}
                        </div>
                        {categoria.descripcion && (
                          <p className="text-sm text-gray-600 mt-1">{categoria.descripcion}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(categoria)}
                          className="p-2 text-pirateRed hover:bg-pirateRed hover:bg-opacity-10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(categoria)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add New Category */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-pirateRedDark mb-4">Añadir Nueva Categoría</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pirateRedDark mb-2">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                  placeholder="Ej: Electrónicos, Ropa, Comida..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-pirateRedDark mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                  placeholder="Descripción de la categoría..."
                  rows={3}
                />
              </div>

              <button
                onClick={handleCreateNew}
                disabled={isSubmitting || !newCategoryName.trim()}
                className="inline-flex items-center px-4 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Creando...' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}