import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Tag, Save } from 'lucide-react';
import { useFinanzasStore, CategoriaGasto } from '../lib/store/finanzasStore';

interface FinanzasCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FinanzasCategoryModal({ isOpen, onClose }: FinanzasCategoryModalProps) {
  const { 
    categorias, 
    isSubmitting, 
    fetchCategorias, 
    createCategoria, 
    updateCategoria, 
    deleteCategoria 
  } = useFinanzasStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
    }
  }, [isOpen, fetchCategorias]);

  const handleEdit = (categoria: CategoriaGasto) => {
    setEditingId(categoria.id!);
    setEditingName(categoria.nombre);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    await updateCategoria(editingId, { nombre: editingName.trim() });
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      await deleteCategoria(id);
    }
  };

  const handleCreateNew = async () => {
    if (!newCategoryName.trim()) return;
    await createCategoria({ nombre: newCategoryName.trim() });
    setNewCategoryName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Gestionar Categorías de Gastos</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="p-6">
          <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
            {categorias.map((cat) => (
              <div key={cat.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                {editingId === cat.id ? (
                  <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full p-1 border rounded-md" />
                ) : (
                  <span>{cat.nombre}</span>
                )}
                <div className="flex space-x-2">
                  {editingId === cat.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="p-2 text-green-600"><Save className="w-4 h-4" /></button>
                      <button onClick={handleCancelEdit} className="p-2 text-gray-500"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(cat)} className="p-2 text-blue-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(cat.id!)} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Añadir Nueva Categoría</h3>
            <div className="flex space-x-2">
              <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nombre de la categoría" className="flex-1 p-2 border rounded-md" />
              <button onClick={handleCreateNew} disabled={isSubmitting || !newCategoryName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}