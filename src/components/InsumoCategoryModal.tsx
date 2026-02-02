import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Tag, Save, Ambulance as Cancel } from 'lucide-react';
import { useInsumosStore, type InsumoCategoria } from '../lib/store/insumosStore';

interface InsumoCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InsumoCategoryModal({ isOpen, onClose }: InsumoCategoryModalProps) {
  const { 
    categoriasInsumo, 
    isSubmitting, 
    fetchInsumoCategorias, 
    createInsumoCategoria, 
    updateInsumoCategoria, 
    deleteInsumoCategoria 
  } = useInsumosStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchInsumoCategorias();
    }
  }, [isOpen, fetchInsumoCategorias]);

  const handleEdit = (categoria: InsumoCategoria) => {
    setEditingId(categoria.id);
    setEditingName(categoria.nombre);
    setEditingDescription(categoria.descripcion || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await updateInsumoCategoria(editingId, {
        nombre: editingName.trim(),
        descripcion: editingDescription.trim() || undefined,
      });
      setEditingId(null);
      setEditingName('');
      setEditingDescription('');
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const handleDelete = async (categoria: InsumoCategoria) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoria.nombre}"?`)) {
      try {
        await deleteInsumoCategoria(categoria.id!);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleCreateNew = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await createInsumoCategoria({
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Tag className="w-6 h-6 mr-2 text-blue-600" />
            Gestionar Categorías de Insumos
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Categories List */}
          <div className="space-y-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categorías Existentes</h3>
            
            {categoriasInsumo.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay categorías creadas</p>
              </div>
            ) : (
              categoriasInsumo.map((categoria) => (
                <div key={categoria.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingId === categoria.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Nombre de la categoría"
                      />
                      <textarea
                        value={editingDescription}
                        onChange={(e) => setEditingDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Descripción (opcional)"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSubmitting || !editingName.trim()}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                          className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Cancel className="w-4 h-4 mr-1" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{categoria.nombre}</h4>
                        {categoria.descripcion && (
                          <p className="text-sm text-gray-600 mt-1">{categoria.descripcion}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(categoria)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Añadir Nueva Categoría</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Carnes, Lácteos, Empaques..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descripción de la categoría..."
                  rows={3}
                />
              </div>

              <button
                onClick={handleCreateNew}
                disabled={isSubmitting || !newCategoryName.trim()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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