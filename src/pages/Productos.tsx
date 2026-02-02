import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Tag,
  DollarSign,
  Package2,
  Settings,
  TrendingUp,
  MoreVertical,
  X,
  Grid3X3,
  List,
  RefreshCw,
  ChefHat
} from 'lucide-react';
import { useProductosStore, type Producto } from '../lib/store/productosStore';
import { ProductForm } from '../components/ProductForm';
import { CategoryModal } from '../components/CategoryModal';
import { StockMovementForm } from '../components/StockMovementForm';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/utils/formatters';
import toast from 'react-hot-toast';

// Función para capitalizar la primera letra
const capitalizeFirst = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Función para formatear fecha y hora por separado
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

// Componente FAB para acciones de producto
interface ProductoFABProps {
  producto: Producto;
  onEdit: () => void;
  onToggleActive: () => void;
  onStockAdjustment: () => void;
  onDelete: () => void;
}

function ProductoFAB({ producto, onEdit, onToggleActive, onStockAdjustment, onDelete }: ProductoFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close FAB when clicking outside
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
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isOpen 
            ? 'bg-pirateRed text-boneWhite shadow-lg rotate-45' 
            : 'bg-boneWhite border-2 border-pirateRed text-pirateRed hover:bg-pirateRed hover:text-boneWhite hover:shadow-xl'
        }`}
      >
        {isOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      {/* Acciones desplegables */}
      <div className={`absolute bottom-10 sm:bottom-12 right-0 flex flex-col space-y-2 transition-all duration-300 z-20 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {producto.controlar_stock && (
          <button
            onClick={() => {
              onStockAdjustment();
              setIsOpen(false);
            }}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-700 transition-colors"
            title="Ajustar Stock"
          >
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
        
        <button
          onClick={() => {
            onEdit();
            setIsOpen(false);
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-pirateRed text-boneWhite rounded-full flex items-center justify-center shadow-lg hover:bg-pirateRedDark transition-colors"
          title="Editar"
        >
          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
        
        <button
          onClick={() => {
            onToggleActive();
            setIsOpen(false);
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 text-white rounded-full flex items-center justify-center shadow-lg transition-colors ${
            producto.activo === false
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
          title={producto.activo === false ? 'Activar' : 'Desactivar'}
        >
          {producto.activo === false ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
        </button>
        
        <button
          onClick={() => {
            onDelete();
            setIsOpen(false);
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}

export function Productos() {
  const { 
    productos, 
    categorias, 
    isLoading, 
    isSubmitting,
    fetchProductos, 
    fetchCategorias, 
    deleteProducto, 
    toggleProductoActivo 
  } = useProductosStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [selectedProductoForStock, setSelectedProductoForStock] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productoToDelete, setProductoToDelete] = useState<Producto | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    // Recuperar preferencia del localStorage
    const saved = localStorage.getItem('productos-view-preference');
    return (saved as 'grid' | 'list') || 'grid';
  });
  const [productosEstaciones, setProductosEstaciones] = useState<Record<number, any[]>>({});

  // Guardar preferencia en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('productos-view-preference', viewMode);
  }, [viewMode]);

  // Cargar estaciones de productos
  const loadProductosEstaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('productos_estaciones')
        .select(`
          producto_id,
          estacion:estaciones_cocina(
            id,
            nombre,
            color
          )
        `);

      if (error) throw error;

      // Agrupar por producto_id
      const grouped = (data || []).reduce((acc: Record<number, any[]>, item: any) => {
        if (!acc[item.producto_id]) {
          acc[item.producto_id] = [];
        }
        if (item.estacion) {
          acc[item.producto_id].push(item.estacion);
        }
        return acc;
      }, {});

      setProductosEstaciones(grouped);
    } catch (error) {
      console.error('Error loading productos estaciones:', error);
    }
  };

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
    loadProductosEstaciones();
  }, [fetchProductos, fetchCategorias]);

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || producto.categoria_id?.toString() === selectedCategory;
    const matchesActive = showInactive || producto.activo !== false;
    
    return matchesSearch && matchesCategory && matchesActive;
  });

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto);
    setIsFormOpen(true);
  };

  const handleDelete = async (producto: Producto) => {
    setProductoToDelete(producto);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productoToDelete?.id) return;
    
    try {
      await deleteProducto(productoToDelete.id);
      setIsDeleteConfirmOpen(false);
      setProductoToDelete(null);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleToggleActive = async (producto: Producto) => {
    await toggleProductoActivo(producto.id!, !producto.activo);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProducto(null);
    // Recargar estaciones después de editar
    loadProductosEstaciones();
  };

  const handleStockAdjustment = (producto: Producto) => {
    if (!producto.controlar_stock) {
      toast.error('Este producto no tiene control de stock activado');
      return;
    }
    setSelectedProductoForStock(producto);
    setIsStockModalOpen(true);
  };

  const handleStockModalClose = () => {
    setIsStockModalOpen(false);
    setSelectedProductoForStock(null);
  };

  const getStockStatus = (producto: Producto) => {
    if (!producto.controlar_stock) return null;
    
    const stock = producto.stock_actual || 0;
    const minimo = producto.stock_minimo || 0;
    
    if (stock <= 0) return { text: 'Sin stock', color: 'text-red-700 bg-red-100 border-red-200' };
    if (stock <= minimo) return { text: 'Stock bajo', color: 'text-yellow-700 bg-yellow-100 border-yellow-200' };
    return { text: 'En stock', color: 'text-green-700 bg-green-100 border-green-200' };
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 sm:p-6 lg:p-8 pb-0">
      {/* Header Actions */}
      <div className="flex justify-between mb-6">
        <div>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center px-3 md:px-4 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark transition-colors mr-2 shadow-md"
          >
            <Settings className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Gestionar Categorías</span>
          </button>
        </div>
        <div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center px-3 md:px-4 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark transition-colors shadow-md"
          >
            <Plus className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md border border-gray-300 p-3 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col space-y-3 md:space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 gap-2 lg:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:gap-2">
            <div className="relative w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id.toString()}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Toggle de vista */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex-1 sm:flex-none flex items-center justify-center px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-pirateRed shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span>Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 sm:flex-none flex items-center justify-center px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-pirateRed shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span>Lista</span>
              </button>
            </div>
            
            {/* Inactive Filter */}
            <div className="flex items-center justify-between sm:justify-start">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
              />
              <label htmlFor="showInactive" className="ml-2 text-xs sm:text-sm text-gray-700">
                Mostrar inactivos
              </label>
            </div>
          </div>
          
          <div className="text-xs sm:text-sm text-gray-500 flex items-center justify-center sm:justify-start">
            <Package2 className="w-4 h-4 mr-1" />
            {filteredProductos.length} productos
            {showInactive && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                Incluye inactivos
              </span>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4">
      {/* Products List/Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pirateRed"></div>
          <span className="ml-2 text-gray-600">Cargando productos...</span>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-gray-300 p-8 md:p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedCategory ? 'No se encontraron productos con los filtros aplicados.' : 'Comienza creando tu primer producto.'}
          </p>
          {!searchTerm && !selectedCategory && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark transition-colors shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Producto
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Vista de Tarjetas
        <div className="space-y-4">
          {filteredProductos.map((producto) => {
            const stockStatus = getStockStatus(producto);
            const { date, time } = formatDateAndTime(producto.updated_at || '');
            
            return (
              <div 
                key={producto.id} 
                className="bg-white rounded-lg shadow-md border border-gray-300 p-4 sm:p-6 hover:shadow-lg transition-all duration-200 relative"
              >
                {/* Layout with proper spacing for FAB */}
                <div className="flex flex-col space-y-3 pr-12 sm:pr-16">
                  {/* Producto Info */}
                  <div className="flex-1">
                    <div className="flex-1 min-w-0">
                      <div className="space-y-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-base sm:text-lg font-semibold text-pirateRedDark truncate">
                              {capitalizeFirst(producto.nombre)}
                            </h3>
                            {producto.categoria?.nombre && (
                              <span className="mt-1 sm:mt-0 sm:ml-2 px-2 py-1 text-xs font-medium bg-pirateRed bg-opacity-10 text-pirateRed rounded-full border border-pirateRed border-opacity-20 w-fit">
                                {producto.categoria.nombre}
                              </span>
                            )}
                          </div>
                          {producto.descripcion && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                              {producto.descripcion}
                            </p>
                          )}
                          
                          {/* Código del producto */}
                          {producto.codigo && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Código:</span>{' '}
                                <span className="text-gray-700 font-mono">{producto.codigo}</span>
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Precios, Stock, y Fecha - Mobile Grid Layout */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          {/* Precios */}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Precio</div>
                            <div className="text-sm font-semibold text-pirateRedDark">
                              {producto.precio_descuento && producto.precio_descuento > 0 ? (
                                <div>
                                  <span className="text-green-600 font-bold">
                                    {formatCurrency(producto.precio_descuento)}
                                  </span>
                                  <div className="text-xs text-gray-500 line-through">
                                    {formatCurrency(producto.precio_regular || 0)}
                                  </div>
                                </div>
                              ) : (
                                formatCurrency(producto.precio_regular || 0)
                              )}
                            </div>
                            {/* Corrección para que el 0 se muestre como dinero y no                                     como texto plano */}
                              {(producto.costo !== null && producto.costo !== undefined)                                   && (
                                  <div className="text-xs text-gray-500">
                                    Costo: {formatCurrency(producto.costo)}
                                  </div>
                              )}
                          </div>
                          
                          {/* Stock */}
                          {producto.controlar_stock && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Stock</div>
                              <div className="text-sm font-semibold text-gray-900">
                                {producto.stock_actual || 0} {producto.unidad_medida}
                              </div>
                              <div className="text-xs text-gray-500">
                                Mín: {producto.stock_minimo || 0}
                              </div>
                            </div>
                          )}
                          
                          {/* Última actualización */}
                          <div className={`${producto.controlar_stock ? 'col-span-2 sm:col-span-1' : 'col-span-1'}`}>
                            <div className="text-xs text-gray-500 mb-1">Actualizado</div>
                            <div className="text-xs text-gray-600 font-medium">
                              {date}
                            </div>
                            <div className="text-xs text-gray-500">
                              {time}
                            </div>
                          </div>
                        </div>
                        
                        {/* Status y badges */}
                        <div className="flex items-center justify-start flex-wrap gap-2">
                          {producto.destacado && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              <Star className="w-3 h-3 mr-1" />
                              Destacado
                            </span>
                          )}
                          
                          {stockStatus && (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                          )}
                          
                          {producto.activo === false && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Inactivo
                            </span>
                          )}

                          {producto.requiere_salsas && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              Requiere salsas
                            </span>
                          )}

                          {producto.etiqueta_nombre && (
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
                              style={{ backgroundColor: producto.etiqueta_color }}
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {producto.etiqueta_nombre}
                            </span>
                          )}

                          {/* Badges de Estaciones de Cocina */}
                          {producto.id && productosEstaciones[producto.id]?.map((estacion: any) => (
                            <span
                              key={estacion.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border border-opacity-50"
                              style={{ backgroundColor: estacion.color }}
                              title={`Estación: ${estacion.nombre}`}
                            >
                              <ChefHat className="w-3 h-3 mr-1" />
                              {estacion.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAB - Better positioned to avoid overlap */}
                <div className="absolute top-4 right-3 sm:top-6 sm:right-6">
                  <ProductoFAB
                    producto={producto}
                    onEdit={() => handleEdit(producto)}
                    onToggleActive={() => handleToggleActive(producto)}
                    onStockAdjustment={() => handleStockAdjustment(producto)}
                    onDelete={() => handleDelete(producto)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista de Lista
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-boneWhite sticky top-0 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-32">
                    Precio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-24">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-24">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProductos.map((producto) => {
                  const stockStatus = getStockStatus(producto);
                  
                  return (
                    <tr 
                      key={producto.id} 
                      className="hover:bg-pirateRed hover:bg-opacity-5 transition-colors relative"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {/* Imagen del producto */}
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                            {producto.imagenes_urls && producto.imagenes_urls.length > 0 && producto.imagenes_urls[0] ? (
                              <img
                                src={producto.imagenes_urls[0]}
                                alt={producto.nombre}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-pirateRedDark truncate">
                              {capitalizeFirst(producto.nombre)}
                            </div>
                            {producto.codigo && (
                              <div className="text-xs text-gray-500 font-mono">
                                {producto.codigo}
                              </div>
                            )}
                            {producto.categoria?.nombre && (
                              <div className="text-xs text-pirateRed font-medium">
                                {producto.categoria.nombre}
                              </div>
                            )}
                            
                            {/* Badges en lista */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {producto.destacado && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Star className="w-2 h-2 mr-1" />
                                  Destacado
                                </span>
                              )}
                              {producto.requiere_salsas && (
                                <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  Salsas
                                </span>
                              )}
                              {producto.etiqueta_nombre && (
                                <span
                                  className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium text-white"
                                  style={{ backgroundColor: producto.etiqueta_color }}
                                >
                                  {producto.etiqueta_nombre}
                                </span>
                              )}
                              {/* Badges de Estaciones de Cocina */}
                              {producto.id && productosEstaciones[producto.id]?.map((estacion: any) => (
                                <span
                                  key={estacion.id}
                                  className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium text-white"
                                  style={{ backgroundColor: estacion.color }}
                                  title={estacion.nombre}
                                >
                                  <ChefHat className="w-2 h-2 mr-0.5" />
                                  {estacion.nombre.substring(0, 3)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {producto.precio_descuento && producto.precio_descuento > 0 ? (
                            <div>
                              <span className="text-green-600 font-bold">
                                {formatCurrency(producto.precio_descuento)}
                              </span>
                              <div className="text-xs text-gray-500 line-through">
                                {formatCurrency(producto.precio_regular || 0)}
                              </div>
                            </div>
                          ) : (
                            formatCurrency(producto.precio_regular || 0)
                          )}
                        </div>
                          {(producto.costo !== null && producto.costo !== undefined) && (
                            <div className="text-xs text-gray-500">
                              Costo: {formatCurrency(producto.costo)}
                            </div>
                          )}
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap">
                        {producto.controlar_stock ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {producto.stock_actual || 0} {producto.unidad_medida}
                            </div>
                            <div className="text-xs text-gray-500">
                              Mín: {producto.stock_minimo || 0}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin control</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {producto.activo === false ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inactivo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Activo
                            </span>
                          )}
                          
                          {stockStatus && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap relative">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(producto)}
                            className="p-2 text-pirateRed hover:bg-pirateRed hover:bg-opacity-10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {producto.controlar_stock && (
                            <button
                              onClick={() => handleStockAdjustment(producto)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Ajustar Stock"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleToggleActive(producto)}
                            className={`p-2 rounded-lg transition-colors ${
                              producto.activo === false
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            title={producto.activo === false ? 'Activar' : 'Desactivar'}
                          >
                            {producto.activo === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          
                          <button
                            onClick={() => {
                              setProductoToDelete(producto);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setProductoToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Producto?"
        message={`¿Estás seguro de que quieres eliminar "${productoToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        type="danger"
        isSubmitting={isSubmitting}
      />

      {/* Product Form Modal */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        producto={editingProducto}
        onSuccess={() => {
          fetchProductos();
        }}
      />

      {/* Category Management Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Stock Movement Modal */}
      {selectedProductoForStock && (
        <StockMovementForm
          isOpen={isStockModalOpen}
          onClose={handleStockModalClose}
          producto={selectedProductoForStock}
          onSuccess={() => {
            fetchProductos();
          }}
        />
      )}
    </div>
  );
}