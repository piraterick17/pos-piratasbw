// src/components/InsumoQuickUpdateTable.tsx
import React, { useState, useEffect } from 'react';
import { useInsumosStore, type Insumo } from '../lib/store/insumosStore';
import { Save, RefreshCw, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface InsumoQuickUpdateTableProps {
  onClose: () => void;
}

export function InsumoQuickUpdateTable({ onClose }: InsumoQuickUpdateTableProps) {
  const { insumos, fetchInsumos, updateStockBatch, isSubmitting, isLoading } = useInsumosStore();
  const [editedStocks, setEditedStocks] = useState<Record<number, string>>({});
  const [changes, setChanges] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchInsumos();
  }, [fetchInsumos]);

  const handleStockChange = (insumo: Insumo, value: string) => {
    setEditedStocks(prev => ({ ...prev, [insumo.id!]: value }));
    const originalStock = insumo.stock_actual || 0;
    const newStock = parseFloat(value);
    if (!isNaN(newStock) && newStock !== originalStock) {
      setChanges(prev => ({ ...prev, [insumo.id!]: newStock }));
    } else {
      // Si el valor vuelve a ser el original, lo quitamos de los cambios
      const newChanges = { ...changes };
      delete newChanges[insumo.id!];
      setChanges(newChanges);
    }
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast('No hay cambios para guardar.', { icon: 'ℹ️' });
      return;
    }

    const updates = Object.entries(changes).map(([id, stock_actual]) => ({
      id: Number(id),
      stock_actual,
    }));

    await updateStockBatch(updates);
    onClose();
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Cargando insumos...</div>;
  }
  
  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <RefreshCw className="w-5 h-5 mr-2 text-blue-600" />
          Actualización Rápida de Stock
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Insumo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Stock Actual</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Unidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {insumos.map((insumo) => (
              <tr key={insumo.id} className={changes[insumo.id!] !== undefined ? 'bg-blue-50' : ''}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {insumo.nombre}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <input
                    type="number"
                    step="0.001"
                    value={editedStocks[insumo.id!] ?? insumo.stock_actual ?? ''}
                    onChange={(e) => handleStockChange(insumo, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {insumo.unidad_medida}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSubmitting || !hasChanges}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Guardando...' : `Guardar ${Object.keys(changes).length} Cambios`}
        </button>
      </div>

      {hasChanges && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5" />
            Tienes cambios sin guardar.
          </div>
        </div>
      )}
    </div>
  );
}