import React, { useEffect, useState } from 'react';
import { 
  Trash, 
  Package, 
  AlertTriangle, 
  Save, 
  Search,
  Calendar,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useInsumosStore, type Insumo, type MovimientoInsumo } from '../lib/store/insumosStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';

export function Mermas() {
  const { 
    insumos, 
    isLoading, 
    isSubmitting,
    fetchInsumos, 
    createMovimientoInsumo,
    fetchMermas
  } = useInsumosStore();

  const [formData, setFormData] = useState({
    insumo_id: '',
    cantidad: 0,
    motivo: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [historialMermas, setHistorialMermas] = useState<MovimientoInsumo[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  useEffect(() => {
    fetchInsumos();
    cargarHistorialMermas();
  }, [fetchInsumos]);

  const filteredInsumos = insumos.filter(insumo => {
    const searchLower = searchTerm.toLowerCase();
    return insumo.nombre.toLowerCase().includes(searchLower);
  });

  const selectedInsumo = insumos.find(i => i.id?.toString() === formData.insumo_id);

  const cargarHistorialMermas = async () => {
    setLoadingHistorial(true);
    try {
      const mermas = await fetchMermas();
      setHistorialMermas(mermas);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.insumo_id || formData.cantidad <= 0) {
      return;
    }

    try {
      await createMovimientoInsumo({
        insumo_id: Number(formData.insumo_id),
        tipo_movimiento: 'merma',
        cantidad: -Math.abs(formData.cantidad), // Siempre negativo para mermas
        motivo: formData.motivo.trim() || 'Merma registrada',
      });
      
      // Reset form
      setFormData({
        insumo_id: '',
        cantidad: 0,
        motivo: '',
      });
      cargarHistorialMermas();
      setSearchTerm('');
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const stockResultante = selectedInsumo 
    ? (selectedInsumo.stock_actual || 0) - formData.cantidad 
    : 0;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Trash className="w-8 h-8 mr-3 text-red-600" />
          Registro de Mermas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Registra pérdidas, desperdicios o productos caducados.
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de Insumo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insumo *
              </label>
              
              {/* Buscador */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar insumo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Lista de insumos */}
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    Cargando insumos...
                  </div>
                ) : filteredInsumos.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron insumos' : 'No hay insumos disponibles'}
                  </div>
                ) : (
                  filteredInsumos.map((insumo) => (
                    <button
                      key={insumo.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, insumo_id: insumo.id!.toString() })}
                      className={`w-full p-3 text-left border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${
                        formData.insumo_id === insumo.id?.toString() 
                          ? 'bg-blue-50 border-blue-200' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Package className="w-4 h-4 text-gray-400 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">{insumo.nombre}</div>
                            <div className="text-sm text-gray-500">
                              Stock: {insumo.stock_actual || 0} {insumo.unidad_medida}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(insumo.costo_unitario || 0)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Información del insumo seleccionado */}
            {selectedInsumo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Insumo Seleccionado</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Nombre:</span>
                    <div className="font-medium text-blue-900">{selectedInsumo.nombre}</div>
                  </div>
                  <div>
                    <span className="text-blue-700">Stock Actual:</span>
                    <div className="font-medium text-blue-900">
                      {selectedInsumo.stock_actual || 0} {selectedInsumo.unidad_medida}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Costo Unitario:</span>
                    <div className="font-medium text-blue-900">
                      {formatCurrency(selectedInsumo.costo_unitario || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Unidad:</span>
                    <div className="font-medium text-blue-900">{selectedInsumo.unidad_medida}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad a dar de baja *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={formData.cantidad || ''}
                  onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.000"
                  required
                />
                {selectedInsumo && (
                  <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                    {selectedInsumo.unidad_medida}
                  </span>
                )}
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la Merma
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Producto caducado, derrame, rotura, etc."
              />
            </div>

            {/* Preview del impacto */}
            {selectedInsumo && formData.cantidad > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <h4 className="font-semibold text-red-900">Impacto de la Merma</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-red-700">Stock Actual:</span>
                    <div className="font-semibold text-red-900">
                      {selectedInsumo.stock_actual || 0} {selectedInsumo.unidad_medida}
                    </div>
                  </div>
                  <div>
                    <span className="text-red-700">Cantidad a Dar de Baja:</span>
                    <div className="font-semibold text-red-900">
                      -{formData.cantidad} {selectedInsumo.unidad_medida}
                    </div>
                  </div>
                  <div>
                    <span className="text-red-700">Stock Resultante:</span>
                    <div className={`font-semibold ${stockResultante < 0 ? 'text-red-900' : 'text-red-800'}`}>
                      {stockResultante} {selectedInsumo.unidad_medida}
                    </div>
                  </div>
                </div>
                
                {stockResultante < 0 && (
                  <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800 font-medium">
                        ⚠️ La cantidad excede el stock disponible. El stock resultante será negativo.
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">Costo de la Merma:</span>
                    <span className="font-semibold text-red-900">
                      {formatCurrency((selectedInsumo.costo_unitario || 0) * formData.cantidad)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !formData.insumo_id || formData.cantidad <= 0}
                className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Registrando...' : 'Registrar Merma'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Historial de Mermas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-red-600" />
            Historial de Mermas
          </h2>
          <button
            onClick={cargarHistorialMermas}
            className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Actualizar
          </button>
        </div>

        {loadingHistorial ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-2 text-gray-600">Cargando historial...</span>
          </div>
        ) : historialMermas.length === 0 ? (
          <div className="text-center py-12">
            <Trash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros de mermas</h3>
            <p className="text-gray-500">
              Aún no se han registrado mermas en el sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Insumo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historialMermas.map((merma) => (
                  <tr key={merma.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(merma.fecha || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <Package className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{merma.insumo?.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {Math.abs(merma.cantidad)} {merma.insumo?.unidad_medida}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {merma.motivo || 'Sin motivo especificado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <User className="w-4 h-4 inline mr-1" /> Sistema
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}