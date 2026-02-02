import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Settings,
  TrendingUp,
  RefreshCw,
  MoreVertical,
  X
} from 'lucide-react';
import { useInsumosStore, type Insumo } from '../lib/store/insumosStore';
import { InsumoForm } from '../components/InsumoForm';
import { MovimientoInsumoForm } from '../components/MovimientoInsumoForm';
import { InsumoCategoryModal } from '../components/InsumoCategoryModal';
import { InsumoQuickUpdateTable } from '../components/InsumoQuickUpdateTable';
import { AlertasInventario } from '../components/AlertasInventario';
import { formatCurrency } from '../lib/utils/formatters';

const capitalizeFirst = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatDateAndTime = (dateString: string) => {
  if (!dateString) return { date: 'No disponible', time: '' };

  const date = new Date(dateString);
  const dateFormatted = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  const timeFormatted = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return { date: dateFormatted, time: timeFormatted };
};

interface InsumoFABProps {
  insumo: Insumo;
  onEdit: () => void;
  onMovimiento: () => void;
  onDelete: () => void;
}

function InsumoFAB({ insumo, onEdit, onMovimiento, onDelete }: InsumoFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-pirateRed text-boneWhite shadow-lg rotate-90'
            : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-pirateRed hover:text-pirateRed hover:shadow-md'
        }`}
      >
        {isOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
      </button>

      <div className={`absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden transition-all duration-200 z-30 ${
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <button
          onClick={() => {
            onMovimiento();
            setIsOpen(false);
          }}
          className="w-full px-4 py-2.5 text-left text-sm hover:bg-green-50 transition-colors flex items-center text-green-700 border-b border-gray-100"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Ajustar Stock
        </button>

        <button
          onClick={() => {
            onEdit();
            setIsOpen(false);
          }}
          className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center text-blue-700 border-b border-gray-100"
        >
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </button>

        <button
          onClick={() => {
            onDelete();
            setIsOpen(false);
          }}
          className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 transition-colors flex items-center text-red-700"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </button>
      </div>
    </div>
  );
}

export function Insumos() {
  const {
    insumos,
    categoriasInsumo,
    isLoading,
    fetchInsumos,
    fetchInsumoCategorias,
    deleteInsumo,
    getInsumosConStockBajo
  } = useInsumosStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isInsumoFormOpen, setIsInsumoFormOpen] = useState(false);
  const [isMovimientoFormOpen, setIsMovimientoFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isQuickUpdateMode, setIsQuickUpdateMode] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [selectedInsumoForMovimiento, setSelectedInsumoForMovimiento] = useState<Insumo | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchInsumos();
        await fetchInsumoCategorias();
      } catch (error) {
        console.error('Error loading insumos data:', error);
      }
    };

    loadData();
  }, [fetchInsumos, fetchInsumoCategorias]);

  const filteredInsumos = insumos.filter(insumo => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      insumo.nombre.toLowerCase().includes(searchLower) ||
      insumo.descripcion?.toLowerCase().includes(searchLower) ||
      insumo.unidad_medida.toLowerCase().includes(searchLower)
    );

    const matchesCategory = !selectedCategory || insumo.categoria_id?.toString() === selectedCategory;
    const matchesLowStock = !showLowStockOnly || (insumo.stock_actual || 0) <= (insumo.stock_minimo || 0);

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const insumosConStockBajo = getInsumosConStockBajo();

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setIsInsumoFormOpen(true);
  };

  const handleDelete = async (insumo: Insumo) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${insumo.nombre}"?`)) {
      try {
        await deleteInsumo(insumo.id!);
      } catch (error) {
        // Error handling is done in the store
      }
    }
  };

  const handleMovimiento = (insumo: Insumo) => {
    setSelectedInsumoForMovimiento(insumo);
    setIsMovimientoFormOpen(true);
  };

  const handleFormClose = () => {
    setIsInsumoFormOpen(false);
    setEditingInsumo(null);
  };

  const handleMovimientoFormClose = () => {
    setIsMovimientoFormOpen(false);
    setSelectedInsumoForMovimiento(null);
  };

  const getStockStatus = (insumo: Insumo) => {
    const stock = insumo.stock_actual || 0;
    const minimo = insumo.stock_minimo || 0;

    if (stock <= 0) return { text: 'Sin stock', color: 'text-red-700 bg-red-50 border-red-200' };
    if (stock <= minimo) return { text: 'Stock bajo', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    return { text: 'En stock', color: 'text-green-700 bg-green-50 border-green-200' };
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header fijo - Optimizado para móvil */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        {/* Barra de acciones superior */}
        <div className="p-3 sm:p-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Categorías</span>
              </button>
              <button
                onClick={() => setIsQuickUpdateMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
            <button
              onClick={() => setIsInsumoFormOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-pirateRed text-white rounded-lg hover:bg-pirateRedDark transition-colors shadow-sm whitespace-nowrap text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Alertas */}
        {insumosConStockBajo.length > 0 && !showLowStockOnly && (
          <div className="px-3 sm:px-4 py-2 bg-yellow-50 border-b border-yellow-100">
            <AlertasInventario />
          </div>
        )}

        {/* Barra de búsqueda y filtros */}
        <div className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar insumos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed bg-white"
              />
            </div>

            {/* Filtros en una línea optimizada */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed bg-white"
              >
                <option value="">Todas las categorías</option>
                {categoriasInsumo.map((categoria) => (
                  <option key={categoria.id} value={categoria.id?.toString()}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-300 whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={(e) => setShowLowStockOnly(e.target.checked)}
                  className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                />
                <span className="text-sm text-gray-700 font-medium">Stock bajo</span>
              </label>

              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 whitespace-nowrap">
                <ClipboardList className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{filteredInsumos.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4">
          {isQuickUpdateMode ? (
            <InsumoQuickUpdateTable onClose={() => setIsQuickUpdateMode(false)} />
          ) : (
            <>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-pirateRed mb-4"></div>
                  <span className="text-sm text-gray-600">Cargando insumos...</span>
                </div>
              ) : filteredInsumos.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay insumos</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {searchTerm ? 'No se encontraron insumos con los criterios de búsqueda.' : 'Comienza creando tu primer insumo.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setIsInsumoFormOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-pirateRed text-white rounded-lg hover:bg-pirateRedDark transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Insumo
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {filteredInsumos.map((insumo) => {
                    const stockStatus = getStockStatus(insumo);
                    const { date, time } = formatDateAndTime(insumo.updated_at || '');

                    return (
                      <div
                        key={insumo.id}
                        className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        {/* Header con nombre y acciones */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
                                {capitalizeFirst(insumo.nombre)}
                              </h3>
                              {insumo.categoria?.nombre && (
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-pirateRed/10 text-pirateRed rounded-full">
                                  {insumo.categoria.nombre}
                                </span>
                              )}
                            </div>
                            <InsumoFAB
                              insumo={insumo}
                              onEdit={() => handleEdit(insumo)}
                              onMovimiento={() => handleMovimiento(insumo)}
                              onDelete={() => handleDelete(insumo)}
                            />
                          </div>
                          {insumo.descripcion && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {insumo.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Información principal */}
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Stock Actual</div>
                              <div className="text-lg font-bold text-gray-900">
                                {insumo.stock_actual || 0}
                              </div>
                              <div className="text-xs text-gray-500">
                                {insumo.unidad_medida} (Mín: {insumo.stock_minimo || 0})
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-gray-500 mb-1">Costo Unitario</div>
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(insumo.costo_unitario || 0)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Por {insumo.unidad_medida}
                              </div>
                            </div>
                          </div>

                          {/* Estado y última actualización */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">{date}</div>
                              <div className="text-xs text-gray-400">{time}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <InsumoForm
        isOpen={isInsumoFormOpen}
        onClose={handleFormClose}
        insumo={editingInsumo}
        onSuccess={() => {
          fetchInsumos();
        }}
        categoriasInsumo={categoriasInsumo}
      />

      {selectedInsumoForMovimiento && (
        <MovimientoInsumoForm
          isOpen={isMovimientoFormOpen}
          onClose={handleMovimientoFormClose}
          insumo={selectedInsumoForMovimiento}
          onSuccess={() => {
            fetchInsumos();
          }}
        />
      )}

      <InsumoCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
}
