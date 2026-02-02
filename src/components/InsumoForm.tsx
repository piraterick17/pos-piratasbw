import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Hash, FileText, Save, TrendingUp, Calendar, User, RefreshCw } from 'lucide-react';
import { useInsumosStore, type Insumo, type MovimientoInsumo, type InsumoCategoria } from '../lib/store/insumosStore';
import { useProveedoresStore } from '../lib/store/proveedoresStore';
import { formatDate, formatCurrency } from '../lib/utils/formatters';
import { AsignarProveedorModal } from './AsignarProveedorModal';

interface InsumoFormProps {
  isOpen: boolean;
  onClose: () => void;
  insumo?: Insumo | null;
  categoriasInsumo: InsumoCategoria[];
  onSuccess?: () => void;
}

export function InsumoForm({ isOpen, onClose, insumo, categoriasInsumo, onSuccess }: InsumoFormProps) {
  const { createInsumo, updateInsumo, isSubmitting, fetchMovimientosByInsumoId } = useInsumosStore();
  const { fetchProveedoresByInsumoId } = useProveedoresStore();
  
  const [formData, setFormData] = useState<Insumo>({
    nombre: '',
    descripcion: '',
    unidad_medida: 'unidad',
    stock_actual: 0,
    stock_minimo: 0,
    costo_unitario: 0,
    categoria_id: undefined,
  });

  const isEditing = !!insumo?.id;
  const [activeTab, setActiveTab] = useState<'info' | 'historial' | 'proveedores'>('info');
  const [movimientos, setMovimientos] = useState<MovimientoInsumo[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [proveedoresInsumo, setProveedoresInsumo] = useState<any[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [isAsignarProveedorModalOpen, setIsAsignarProveedorModalOpen] = useState(false);
  const [selectedProveedorInsumo, setSelectedProveedorInsumo] = useState<any | null>(null);

  useEffect(() => {
    if (insumo && isEditing) {
      setFormData({
        nombre: insumo.nombre || '',
        descripcion: insumo.descripcion || '',
        unidad_medida: insumo.unidad_medida || 'unidad',
        categoria_id: insumo.categoria_id,
        stock_actual: insumo.stock_actual || 0,
        stock_minimo: insumo.stock_minimo || 0,
        costo_unitario: insumo.costo_unitario || 0,
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoria_id: undefined,
        unidad_medida: 'unidad',
        stock_actual: 0,
        stock_minimo: 0,
        costo_unitario: 0,
      });
    }
    
    // Cargar historial de movimientos si estamos editando
    if (insumo?.id && isEditing) {
      setLoadingMovimientos(true);
      fetchMovimientosByInsumoId(insumo.id)
        .then(data => {
          setMovimientos(data);
        })
        .finally(() => {
          setLoadingMovimientos(false);
        });
      
      // Cargar proveedores del insumo
      setLoadingProveedores(true);
      fetchProveedoresByInsumoId(insumo.id!)
        .then(data => {
          setProveedoresInsumo(data);
        })
        .finally(() => {
          setLoadingProveedores(false);
        });
    }
  }, [insumo, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre?.trim()) {
      return;
    }

    try {
      if (isEditing) {
        await updateInsumo(insumo.id!, formData);
      } else {
        await createInsumo(formData);
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      nombre: '',
      descripcion: '',
      unidad_medida: 'unidad',
      stock_actual: 0,
      stock_minimo: 0,
      costo_unitario: 0,
    });
  };

  const getTipoMovimientoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'compra': 'Compra',
      'merma': 'Merma',
      'ajuste': 'Ajuste',
      'uso_produccion': 'Uso en Producción'
    };
    return labels[tipo] || tipo;
  };

  const getMovimientoColor = (tipo: string, cantidad: number) => {
    if (tipo === 'compra' || (tipo === 'ajuste' && cantidad > 0)) return 'text-green-600 bg-green-50';
    if (tipo === 'merma' || (tipo === 'ajuste' && cantidad < 0)) return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  const handleOpenAsignarProveedor = (proveedorInsumo?: any) => {
    setSelectedProveedorInsumo(proveedorInsumo || null);
    setIsAsignarProveedorModalOpen(true);
  };

  const handleCloseAsignarProveedor = () => {
    setIsAsignarProveedorModalOpen(false);
    setSelectedProveedorInsumo(null);
  };

  const refreshProveedores = async () => {
    if (insumo?.id) {
      setLoadingProveedores(true);
      try {
        const data = await fetchProveedoresByInsumoId(insumo.id);
        setProveedoresInsumo(data);
      } finally {
        setLoadingProveedores(false);
      }
    }
  };

  const unidadesMedida = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo' },
    { value: 'g', label: 'Gramo' },
    { value: 'l', label: 'Litro' },
    { value: 'ml', label: 'Mililitro' },
    { value: 'caja', label: 'Caja' },
    { value: 'paquete', label: 'Paquete' },
    { value: 'bolsa', label: 'Bolsa' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-2 text-blue-600" />
            {isEditing ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Solo mostrar si estamos editando */}
        {isEditing && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                  activeTab === 'historial'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Historial
              </button>
              <button
                onClick={() => setActiveTab('proveedores')}
                className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none ${
                  activeTab === 'proveedores'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Proveedores
              </button>
            </nav>
          </div>
        )}

        {activeTab === 'info' ? (
          <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Insumo *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria_id || ''}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sin categoría</option>
                    {categoriasInsumo.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion || ''}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descripción del insumo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidad de Medida *
                  </label>
                  <select
                    value={formData.unidad_medida}
                    onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {unidadesMedida.map((unidad) => (
                      <option key={unidad.value} value={unidad.value}>
                        {unidad.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Unitario
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="any" // Permite cualquier decimal
                      min="0"
  // Si el valor es 0, dejamos que se vea "0", pero si el usuario borra todo, permitimos string vacío
                      value={formData.costo_unitario === 0 ? '' : formData.costo_unitario}
                      onChange={(e) => {
                      const val = e.target.value;
    // Si está vacío, ponemos 0 en el estado, si no, parseamos el decimal
    setFormData({
      ...formData,
      costo_unitario: val === '' ? 0 : parseFloat(val)
    });
  }}
  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  placeholder="0.00"
/>
                  </div>
                </div>
              </div>
            </div>

            {/* Control de Stock */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Hash className="w-5 h-5 mr-2" />
                Control de Stock
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Inicial
                  </label>
                  <input
  type="number"
  step="any" // Permite cualquier decimal
  min="0"
  // Si el valor es 0, dejamos que se vea "0", pero si el usuario borra todo, permitimos string vacío
  value={formData.stock_inicial === 0 ? '' : formData.stock_inicial}
  onChange={(e) => {
    const val = e.target.value;
    // Si está vacío, ponemos 0 en el estado, si no, parseamos el decimal
    setFormData({
      ...formData,
      stock_inicial: val === '' ? 0 : parseFloat(val)
    });
  }}
  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  placeholder="0.00"
/>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditing ? 'Para ajustar stock, usa el botón "Ajustar Stock"' : 'Stock inicial del insumo'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Mínimo
                  </label>
                  <input
  type="number"
  step="any" // Permite cualquier decimal
  min="0"
  // Si el valor es 0, dejamos que se vea "0", pero si el usuario borra todo, permitimos string vacío
  value={formData.stock_minimo === 0 ? '' : formData.stock_minimo}
  onChange={(e) => {
    const val = e.target.value;
    // Si está vacío, ponemos 0 en el estado, si no, parseamos el decimal
    setFormData({
      ...formData,
      stock_minimo: val === '' ? 0 : parseFloat(val)
    });
  }}
  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  placeholder="0.00"
/>
                  <p className="text-xs text-gray-500 mt-1">
                    Nivel mínimo para alertas de stock bajo
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Insumo')}
            </button>
          </div>
        </form>
        ) : activeTab === 'historial' ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Historial de Movimientos
              </h3>
              <button
                onClick={() => {
                  setLoadingMovimientos(true);
                  fetchMovimientosByInsumoId(insumo!.id!)
                    .then(data => {
                      setMovimientos(data);
                    })
                    .finally(() => {
                      setLoadingMovimientos(false);
                    });
                }}
                className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Actualizar
              </button>
            </div>

            {loadingMovimientos ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando movimientos...</span>
              </div>
            ) : movimientos.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay movimientos registrados</h3>
                <p className="text-gray-500">
                  Este insumo aún no tiene movimientos de stock registrados.
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
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movimientos.map((movimiento) => (
                      <tr key={movimiento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            {formatDate(movimiento.fecha || '')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovimientoColor(movimiento.tipo_movimiento, movimiento.cantidad)}`}>
                            {getTipoMovimientoLabel(movimiento.tipo_movimiento)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={movimiento.cantidad > 0 ? 'text-green-600' : 'text-red-600'}>
                            {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad} {insumo?.unidad_medida}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movimiento.motivo || 'Sin motivo especificado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Proveedores del Insumo
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={refreshProveedores}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Actualizar
                </button>
                <button
                  onClick={() => handleOpenAsignarProveedor()}
                  className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <User className="w-3 h-3 mr-1" />
                  Asignar Proveedor
                </button>
              </div>
            </div>

            {loadingProveedores ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Cargando proveedores...</span>
              </div>
            ) : proveedoresInsumo.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay proveedores asignados</h3>
                <p className="text-gray-500">
                  Este insumo aún no tiene proveedores asignados.
                </p>
                <button
                  onClick={() => handleOpenAsignarProveedor()}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <User className="w-4 h-4 mr-2" />
                  Asignar Primer Proveedor
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Proveedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Costo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {proveedoresInsumo.map((provInsumo) => (
                      <tr key={`${provInsumo.proveedor_id}-${provInsumo.insumo_id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{provInsumo.proveedor?.nombre}</div>
                              {provInsumo.proveedor?.contacto_nombre && (
                                <div className="text-xs text-gray-500">
                                  Contacto: {provInsumo.proveedor.contacto_nombre}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(provInsumo.costo_especifico)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Actualizado: {formatDate(provInsumo.updated_at || '')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            provInsumo.es_proveedor_activo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {provInsumo.es_proveedor_activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleOpenAsignarProveedor(provInsumo)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Asignar Proveedor Modal */}
      {insumo && (
        <AsignarProveedorModal
          isOpen={isAsignarProveedorModalOpen}
          onClose={handleCloseAsignarProveedor}
          insumoId={insumo.id!}
          insumoNombre={insumo.nombre}
          costoActual={insumo.costo_unitario || 0}
          proveedorInsumo={selectedProveedorInsumo}
          onSuccess={refreshProveedores}
        />
      )}
    </div>
  );
}