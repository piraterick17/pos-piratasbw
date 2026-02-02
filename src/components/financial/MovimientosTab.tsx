import React, { useState, useEffect } from 'react';
import { Plus, Tag, Edit, Trash2, Filter, ArrowUp, ArrowDown, Calendar, Eye, EyeOff, XCircle } from 'lucide-react';
import { useFinanzasStore } from '../../lib/store/finanzasStore';
import { formatCurrency, formatDate } from '../../lib/utils/formatters';
import { MovimientoFormModal } from '../MovimientoFormModal';
import { FinanzasCategoryModal } from '../FinanzasCategoryModal';
import toast from 'react-hot-toast';

export function MovimientosTab() {
  const { movimientos, categorias, fetchMovimientos, fetchCategorias, deleteMovimiento, isLoading } = useFinanzasStore();

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [editingMovimiento, setEditingMovimiento] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnulados, setShowAnulados] = useState(false);

  useEffect(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaInicio(primerDiaMes.toISOString().split('T')[0]);
    setFechaFin(hoy.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      fetchMovimientos(fechaInicio, fechaFin);
      fetchCategorias();
    }
  }, [fechaInicio, fechaFin, fetchMovimientos, fetchCategorias]);

  const handleEdit = (movimiento: any) => {
    if (movimiento.anulado) {
      toast.error('Los movimientos anulados no se pueden editar.');
      return;
    }
    if (movimiento.pedido_id || movimiento.movimiento_insumo_id) {
      toast.error('Los movimientos automáticos no se pueden editar.');
      return;
    }
    setEditingMovimiento(movimiento);
    setIsModalOpen(true);
  };

  const handleDelete = async (movimiento: any) => {
    if (movimiento.anulado) {
      toast.error('Este movimiento ya está anulado.');
      return;
    }
    if (movimiento.pedido_id || movimiento.movimiento_insumo_id) {
      toast.error('Los movimientos automáticos no se pueden anular.');
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres anular este movimiento? Esta acción no se puede revertir.')) {
      await deleteMovimiento(movimiento.id!);
      fetchMovimientos(fechaInicio, fechaFin);
    }
  };

  const filteredMovimientos = movimientos.filter(m => {
    if (!showAnulados && m.anulado) {
      return false;
    }
    if (selectedCategory && m.categoria_id?.toString() !== selectedCategory) {
      return false;
    }
    if (selectedTipo && m.tipo !== selectedTipo) {
      return false;
    }
    return true;
  });

  const getOrigenBadge = (movimiento: any) => {
    if (movimiento.pedido_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Venta
        </span>
      );
    }
    if (movimiento.movimiento_insumo_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Compra
        </span>
      );
    }
// Solo marcamos como CxP si la descripción lo indica explícitamente (formato del nuevo trigger)
    // O si tiene un ID de proveedor PERO fue generado automáticamente.
    const descripcionEsCxP = movimiento.descripcion && movimiento.descripcion.includes('(CxP #');
    
    if (descripcionEsCxP) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Pago CxP
        </span>
      );
    }
    // Si tiene proveedor pero NO es CxP, es una Compra Directa o Gasto
    if (movimiento.proveedor_id) {
       return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Prov. Directo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Manual
      </span>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Libro Mayor de Movimientos</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Registro completo de ingresos y egresos</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Tag className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Categorías</span>
            <span className="sm:hidden">Cat.</span>
          </button>
          <button
            onClick={() => {
              setEditingMovimiento(null);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center md:hidden"
          >
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            <Filter className="w-4 h-4 text-gray-600 ml-2" />
          </button>

          <button
            onClick={() => setShowAnulados(!showAnulados)}
            className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showAnulados
                ? 'bg-red-100 text-red-700 border border-red-300'
                : 'bg-gray-200 text-gray-700 border border-gray-300'
            }`}
          >
            {showAnulados ? (
              <>
                <Eye className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Mostrando anulados</span>
                <span className="sm:hidden">Ver anulados</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Ocultar anulados</span>
                <span className="sm:hidden">Ocultar</span>
              </>
            )}
          </button>
        </div>

        <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Desde
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Hasta
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => fetchMovimientos(fechaInicio, fechaFin)}
                className="w-full bg-blue-600 text-white py-2 px-3 text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando movimientos...</p>
        </div>
      ) : filteredMovimientos.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200 text-gray-500">
          <p className="text-sm">No hay movimientos en el período seleccionado</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 flex flex-col h-[65vh]">
            <div style={{ height: '500px', overflowY: 'auto' }} className="w-full">
            {/* <div className="flex-1 overflow-auto min-h-0"> */}
              <table className="w-full relative border-collapse">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Fecha</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Descripción</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Categoría</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Origen</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Tipo</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-gray-50">Monto</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-50">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMovimientos.map(m => {
                    const categoria = categorias.find(c => c.id === m.categoria_id);
                    const isAutomatic = !!(m.pedido_id || m.movimiento_insumo_id);
                    const isAnulado = !!m.anulado;

                    return (
                      <tr
                        key={m.id}
                        className={`${isAnulado ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}`}
                      >
          {/* ... tus celdas td ... */}
                        <td className="px-3 py-3 text-sm text-gray-900">
                          <span className={isAnulado ? 'line-through' : ''}>
                            {formatDate(m.fecha_movimiento || '')}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className={`text-sm font-medium ${isAnulado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {m.descripcion}
                          </div>
                          {isAnulado && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                              <XCircle className="w-3 h-3 mr-1" />
                              ANULADO
                            </span>
                          )}
                          {m.notas && (
                            <div className="text-xs text-gray-500 mt-1">{m.notas}</div>
                          )}
                        </td>
                        <td className={`px-3 py-3 text-sm ${isAnulado ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                          {categoria ? categoria.nombre : 'Sin categoría'}
                        </td>
                        <td className="px-3 py-3">{getOrigenBadge(m)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            {m.tipo === 'ingreso' ? (
                              <>
                                <ArrowUp className={`w-4 h-4 mr-1 ${isAnulado ? 'text-gray-400' : 'text-green-600'}`} />
                                <span className={`text-sm font-medium ${isAnulado ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                                  Ingreso
                                </span>
                              </>
                            ) : (
                              <>
                                <ArrowDown className={`w-4 h-4 mr-1 ${isAnulado ? 'text-gray-400' : 'text-red-600'}`} />
                                <span className={`text-sm font-medium ${isAnulado ? 'text-gray-400 line-through' : 'text-red-600'}`}>
                                  Egreso
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className={`px-3 py-3 text-right text-sm font-bold ${
                          isAnulado
                            ? 'text-gray-400 line-through'
                            : m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(m.monto)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(m)}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                              disabled={isAutomatic || isAnulado}
                              title={isAnulado ? 'Movimiento anulado' : isAutomatic ? 'Movimiento automático' : 'Editar'}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(m)}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                              disabled={isAutomatic || isAnulado}
                              title={isAnulado ? 'Ya anulado' : isAutomatic ? 'Movimiento automático' : 'Anular movimiento'}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3 overflow-auto max-h-[calc(100vh-400px)] min-h-[400px] pr-2">
            {filteredMovimientos.map(m => {
              const categoria = categorias.find(c => c.id === m.categoria_id);
              const isAutomatic = !!(m.pedido_id || m.movimiento_insumo_id);
              const isAnulado = !!m.anulado;

              return (
                <div
                  key={m.id}
                  className={`rounded-lg border p-4 ${
                    isAnulado ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {m.tipo === 'ingreso' ? (
                          <ArrowUp className={`w-4 h-4 flex-shrink-0 ${isAnulado ? 'text-gray-400' : 'text-green-600'}`} />
                        ) : (
                          <ArrowDown className={`w-4 h-4 flex-shrink-0 ${isAnulado ? 'text-gray-400' : 'text-red-600'}`} />
                        )}
                        <h3 className={`font-semibold text-sm truncate ${isAnulado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {m.descripcion}
                        </h3>
                      </div>
                      {isAnulado && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
                          <XCircle className="w-3 h-3 mr-1" />
                          ANULADO
                        </span>
                      )}
                      <p className={`text-xs ${isAnulado ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                        {formatDate(m.fecha_movimiento || '')}
                      </p>
                    </div>
                    {getOrigenBadge(m)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Monto</p>
                      <p className={`text-base font-bold ${
                        isAnulado
                          ? 'text-gray-400 line-through'
                          : m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(m.monto)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Categoría</p>
                      <p className={`text-sm truncate ${isAnulado ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {categoria ? categoria.nombre : 'Sin categoría'}
                      </p>
                    </div>
                  </div>

                  {m.notas && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500">Notas</p>
                      <p className="text-sm text-gray-700">{m.notas}</p>
                    </div>
                  )}

                  {!isAutomatic && !isAnulado && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(m)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-4 h-4 mr-1.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Anular
                      </button>
                    </div>
                  )}

                  {(isAutomatic || isAnulado) && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 text-center italic">
                        {isAnulado ? 'Movimiento anulado' : 'Movimiento automático protegido'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {isModalOpen && (
        <MovimientoFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingMovimiento(null);
            fetchMovimientos(fechaInicio, fechaFin);
          }}
          movimiento={editingMovimiento}
        />
      )}

      {isCategoryModalOpen && (
        <FinanzasCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            fetchCategorias();
          }}
        />
      )}
    </div>
  );
}
