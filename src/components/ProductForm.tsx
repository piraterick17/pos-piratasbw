import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Tag, Package, DollarSign, Hash, FileText, Image, Settings, Eye, Star, RefreshCw, Droplets, ChefHat, Clock, TrendingUp } from 'lucide-react';
import { useProductosStore, type Producto, type Categoria } from '../lib/store/productosStore';
import { useInsumosStore, type Insumo, type ProductoInsumo } from '../lib/store/insumosStore';
import { useProveedoresStore } from '../lib/store/proveedoresStore';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/utils/formatters';
import toast from 'react-hot-toast';
import { ImageUploader } from './ImageUploader';
import { Percent } from 'lucide-react';

interface Estacion {
  id: string;
  nombre: string;
  orden: number;
  color: string;
  active: boolean;
}

interface ProductoEstacion {
  estacion_id: string;
  tiempo_preparacion: number;
  complejidad: number;
  estacion?: Estacion;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  producto?: Producto | null;
  onSuccess?: () => void;
}

export function ProductForm({ isOpen, onClose, producto, onSuccess }: ProductFormProps) {
  const { categorias, createProducto, updateProducto, isSubmitting, fetchCategorias } = useProductosStore();
  const { insumos, fetchInsumos, fetchProductoInsumos, updateProductoInsumos } = useInsumosStore();
  
  const [formData, setFormData] = useState<Producto>({
    nombre: '',
    descripcion: '',
    precio_regular: 0,
    precio_descuento: 0,
    costo: 0,
    categoria_id: undefined,
    codigo: '',
    costo_manual_activo: false,
    aplicar_gastos_fijos: false,
    porcentaje_gastos_fijos: 0,
    activo: true,
    destacado: false,
    disponible_catalogo: true,
    controlar_stock: false,
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: 'unidad',
    imagenes_urls: [],
    etiqueta_nombre: '',
    etiqueta_color: '#3B82F6',
  });

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [productInsumos, setProductInsumos] = useState<ProductoInsumo[]>([]);
  const [searchInsumo, setSearchInsumo] = useState('');
  const [costoCalculado, setCostoCalculado] = useState<number | null>(null);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [productoEstaciones, setProductoEstaciones] = useState<ProductoEstacion[]>([]);

  useEffect(() => {
    fetchCategorias();
    fetchInsumos();
    loadEstaciones();
  }, [fetchCategorias]);

  const loadEstaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('estaciones_cocina')
        .select('*')
        .eq('active', true)
        .order('orden');

      if (error) throw error;
      setEstaciones(data || []);
    } catch (error) {
      console.error('Error loading estaciones:', error);
      toast.error('Error al cargar estaciones de cocina');
    }
  };

  const loadProductoEstaciones = async (productoId: number) => {
    try {
      const { data, error } = await supabase
        .from('productos_estaciones')
        .select(`
          *,
          estacion:estaciones_cocina(*)
        `)
        .eq('producto_id', productoId);

      if (error) throw error;
      setProductoEstaciones(data || []);
    } catch (error) {
      console.error('Error loading producto estaciones:', error);
    }
  };

  useEffect(() => {
    if (producto) {
      setFormData({
        ...producto,
        precio_regular: producto.precio_regular || 0,
        precio_descuento: producto.precio_descuento || 0,
        costo: producto.costo || 0,
        costo_manual_activo: producto.costo_manual_activo || false,
        aplicar_gastos_fijos: producto.aplicar_gastos_fijos || false,
        porcentaje_gastos_fijos: producto.porcentaje_gastos_fijos || 0,
        stock_actual: producto.stock_actual || 0,
        stock_minimo: producto.stock_minimo || 0,
        imagenes_urls: producto.imagenes_urls || [],
        etiqueta_color: producto.etiqueta_color || '#3B82F6',
      });
      setImageUrls(producto.imagenes_urls || []);
      
      // Cargar insumos del producto
      if (producto.id) {
        fetchProductoInsumos(producto.id).then(setProductInsumos);
        loadProductoEstaciones(producto.id);
      }
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        precio_regular: 0,
        precio_descuento: 0,
        costo: 0,
        costo_manual_activo: false,
        categoria_id: undefined,
        codigo: '',
        activo: true,
        destacado: false,
        disponible_catalogo: true,
        controlar_stock: false,
        stock_actual: 0,
        stock_minimo: 0,
        unidad_medida: 'unidad',
        imagenes_urls: [],
        etiqueta_nombre: '',
        etiqueta_color: '#3B82F6',
      });
      setImageUrls([]);
      setProductInsumos([]);
      setProductoEstaciones([]);
    }
  }, [producto, isOpen]);

  // Calcular el costo basado en la receta + gastos fijos
  useEffect(() => {
    if (productInsumos.length > 0) {
      // 1. Costo Base (Suma de ingredientes)
      const costoInsumos = productInsumos.reduce((total, pi) => {
        const insumo = pi.insumo;
        if (insumo && insumo.costo_unitario) {
          return total + (pi.cantidad_requerida * insumo.costo_unitario);
        }
        return total;
      }, 0);
      
      // 2. Aplicar Margen de Gastos Fijos (Si está activo)
      let costoFinal = costoInsumos;
      const porcentaje = Number(formData.porcentaje_gastos_fijos) || 0;

      if (formData.aplicar_gastos_fijos && porcentaje > 0) {
        // Fórmula: Costo Insumos + (Costo Insumos * % / 100)
        costoFinal += (costoInsumos * (porcentaje / 100));
      }
      
      setCostoCalculado(Number(costoFinal.toFixed(2)));
      
      // 3. Actualizar el campo "Costo" del producto si está en modo automático
      if (!formData.costo_manual_activo && costoFinal > 0) {
        setFormData(prev => ({
          ...prev,
          costo: Number(costoFinal.toFixed(2))
        }));
      }
    } else {
      setCostoCalculado(null);
    }
    // IMPORTANTE: Agregar las nuevas dependencias al array
  }, [productInsumos, formData.costo_manual_activo, formData.aplicar_gastos_fijos, formData.porcentaje_gastos_fijos]);
  
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validación básica
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    // 2. Lógica para decidir qué costo guardar
    // Si no es manual (es automático), usamos el calculado (receta).
    // Si es manual, usamos lo que escribió el usuario.
    let costoParaGuardar = formData.costo; 
    if (!formData.costo_manual_activo) {
        costoParaGuardar = costoCalculado || 0;
    }

    try {
      // 3. Preparar el objeto final
      const dataToSubmit = {
        ...formData,
        imagenes_urls: imageUrls,
        precio_regular: formData.precio_regular || null,
        precio_descuento: formData.precio_descuento || null,
        costo: costoParaGuardar, // <--- Aquí va el valor corregido
      };

      // 4. Guardar (Actualizar o Crear)
      if (producto?.id) {
        // MODO EDICIÓN
        await updateProducto(producto.id, dataToSubmit);
        
        // Guardar receta/insumos si existen
        if (productInsumos.length > 0) {
          await updateProductoInsumos(producto.id, productInsumos);
        }
        
        toast.success('Producto actualizado exitosamente');
      } else {
        // MODO CREACIÓN
        const nuevoProducto = await createProducto(dataToSubmit);
        
        // Guardar receta/insumos asociados al nuevo ID
        if (productInsumos.length > 0 && nuevoProducto?.id) {
          await updateProductoInsumos(nuevoProducto.id, productInsumos);
        }
        // Nota: createProducto en el store ya suele mostrar toast de éxito
      }
      
      // 5. Cerrar formulario
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    }
  };

  const addInsumo = (insumo: Insumo) => {
    const exists = productInsumos.find(pi => pi.insumo_id === insumo.id);
    if (!exists) {
      setProductInsumos([...productInsumos, {
        insumo_id: insumo.id!,
        cantidad_requerida: 1,
        insumo
      }]);
    }
    setSearchInsumo('');
  };

  const updateInsumoQuantity = (insumoId: number, cantidad: number) => {
    setProductInsumos(productInsumos.map(pi => 
      pi.insumo_id === insumoId 
        ? { ...pi, cantidad_requerida: cantidad }
        : pi
    ));
  };

  const removeInsumo = (insumoId: number) => {
    setProductInsumos(productInsumos.filter(pi => pi.insumo_id !== insumoId));
  };

  const filteredInsumos = insumos.filter(insumo =>
    insumo.nombre.toLowerCase().includes(searchInsumo.toLowerCase()) &&
    !productInsumos.find(pi => pi.insumo_id === insumo.id)
  );

  const updateProductoEstaciones = async (productoId: number, estacionesData: ProductoEstacion[]) => {
    try {
      // Eliminar todas las estaciones actuales del producto
      await supabase
        .from('productos_estaciones')
        .delete()
        .eq('producto_id', productoId);

      // Insertar las nuevas estaciones
      if (estacionesData.length > 0) {
        const { error } = await supabase
          .from('productos_estaciones')
          .insert(
            estacionesData.map(pe => ({
              producto_id: productoId,
              estacion_id: pe.estacion_id,
              tiempo_preparacion: pe.tiempo_preparacion,
              complejidad: pe.complejidad
            }))
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating producto estaciones:', error);
      throw error;
    }
  };

  const toggleEstacion = (estacionId: string) => {
    const exists = productoEstaciones.find(pe => pe.estacion_id === estacionId);

    if (exists) {
      setProductoEstaciones(productoEstaciones.filter(pe => pe.estacion_id !== estacionId));
    } else {
      const estacion = estaciones.find(e => e.id === estacionId);
      setProductoEstaciones([...productoEstaciones, {
        estacion_id: estacionId,
        tiempo_preparacion: 10,
        complejidad: 3,
        estacion
      }]);
    }
  };

  const updateEstacionConfig = (estacionId: string, field: 'tiempo_preparacion' | 'complejidad', value: number) => {
    setProductoEstaciones(productoEstaciones.map(pe =>
      pe.estacion_id === estacionId
        ? { ...pe, [field]: value }
        : pe
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="bg-gradient-to-r from-pirateRed to-pirateRedDark px-6 py-4 -m-6 mb-0 rounded-t-xl">
            <h2 className="text-2xl font-bold text-boneWhite flex items-center">
              <Package className="w-6 h-6 mr-2" />
              {producto ? 'Editar Producto' : 'Nuevo Producto'}
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

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda */}
            <div className="space-y-6">
              {/* Información Básica */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Información Básica
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Código/SKU
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.codigo || ''}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                        placeholder="SKU001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Categoría
                    </label>
                    <select
                      value={formData.categoria_id || ''}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion || ''}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                      placeholder="Descripción del producto..."
                    />
                  </div>
                </div>
              </div>

              {/* Precios */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Precios
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Costo {formData.costo_manual_activo ? '(Manual)' : '(Automático)'}
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="costo_manual_activo"
                          checked={formData.costo_manual_activo}
                          onChange={(e) => setFormData({ ...formData, costo_manual_activo: e.target.checked })}
                          className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed mr-2"
                        />
                        <label htmlFor="costo_manual_activo" className="text-sm text-gray-700">
                          Usar costo manual
                        </label>
                      </div>
                      
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costo || ''}
                        onChange={(e) => setFormData({ ...formData, costo: e.target.value ? Number(e.target.value) : 0 })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed ${
                          !formData.costo_manual_activo ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="0.00"
                        disabled={!formData.costo_manual_activo}
                      />
                      
                      {costoCalculado !== null && (
                        <div className="flex items-center text-xs text-gray-500">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Costo calculado desde receta: {formatCurrency(costoCalculado)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Precio Regular
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio_regular || ''}
                      onChange={(e) => setFormData({ ...formData, precio_regular: e.target.value ? Number(e.target.value) : 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Precio Promoción
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio_descuento || ''}
                      onChange={(e) => setFormData({ ...formData, precio_descuento: e.target.value ? Number(e.target.value) : 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {/* === INICIO BLOQUE NUEVO: GASTOS FIJOS === */}
                  <div className="col-span-full sm:col-span-3 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="aplicar_gastos_fijos"
                          checked={formData.aplicar_gastos_fijos || false}
                          onChange={(e) => setFormData({ ...formData, aplicar_gastos_fijos: e.target.checked })}
                          className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed mr-2"
                        />
                        <label htmlFor="aplicar_gastos_fijos" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1 text-blue-600" />
                          Sumar Gastos Indirectos / Fijos
                        </label>
                      </div>
                    </div>

                    {formData.aplicar_gastos_fijos && (
                      <div className="flex items-center gap-4 animate-fadeIn">
                        <div className="flex-1">
                          <label className="text-xs text-gray-600 mb-1 block">Porcentaje a sumar (%)</label>
                          <div className="relative">
                            <Percent className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              value={formData.porcentaje_gastos_fijos || ''}
                              onChange={(e) => setFormData({ ...formData, porcentaje_gastos_fijos: Number(e.target.value) })}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Ej. 30"
                            />
                          </div>
                        </div>
                        <div className="flex-1 text-xs text-gray-500">
                          <p>
                            Se agregará un <strong>{formData.porcentaje_gastos_fijos || 0}%</strong> al costo de los insumos.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* === FIN BLOQUE NUEVO === */}

              {/* Configuración de Salsas */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <Droplets className="w-5 h-5 mr-2" />
                  Configuración de Salsas
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requiere_salsas"
                      checked={formData.requiere_salsas || false}
                      onChange={(e) => setFormData({ ...formData, requiere_salsas: e.target.checked })}
                      className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                    />
                    <label htmlFor="requiere_salsas" className="ml-2 text-sm text-gray-700 flex items-center">
                      <Droplets className="w-4 h-4 mr-1" />
                      Requiere selección de salsas
                    </label>
                  </div>

                  {formData.requiere_salsas && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-pirateRedDark mb-2">
                          Mínimo de Salsas *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.min_salsas || 1}
                          onChange={(e) => setFormData({ ...formData, min_salsas: Number(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-pirateRedDark mb-2">
                          Máximo de Salsas *
                        </label>
                        <input
                          type="number"
                          min={formData.min_salsas || 1}
                          value={formData.max_salsas || 1}
                          onChange={(e) => setFormData({ ...formData, max_salsas: Number(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-6">
              {/* Imágenes */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <Image className="w-5 h-5 mr-2" />
                  Imágenes (máx. 3)
                </h3>

                <ImageUploader
                  imageUrls={imageUrls}
                  onUpdateUrls={setImageUrls}
                  productId={producto?.id}
                  maxImages={3}
                />
              </div>

              {/* Etiqueta */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Etiqueta
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.etiqueta_nombre || ''}
                      onChange={(e) => setFormData({ ...formData, etiqueta_nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                      placeholder="Nuevo, Oferta, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.etiqueta_color || '#3B82F6'}
                      onChange={(e) => setFormData({ ...formData, etiqueta_color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                    />
                  </div>
                </div>
              </div>

              {/* Control de Stock */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Control de Stock
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="controlar_stock"
                      checked={formData.controlar_stock || false}
                      onChange={(e) => setFormData({ ...formData, controlar_stock: e.target.checked })}
                      className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                    />
                    <label htmlFor="controlar_stock" className="ml-2 text-sm text-gray-700">
                      Controlar stock
                    </label>
                  </div>

                  {formData.controlar_stock && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-pirateRedDark mb-2">
                          Stock Actual
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_actual || ''}
                          readOnly={!!producto} // Solo lectura si estamos editando
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed ${
                            !!producto ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                          onChange={(e) => !producto && setFormData({ ...formData, stock_actual: e.target.value ? Number(e.target.value) : 0 })}
                        />
                        {!!producto && (
                          <p className="text-xs text-gray-500 mt-1">
                            Para modificar el stock, usa el botón "Ajustar Stock"
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-pirateRedDark mb-2">
                          Stock Mínimo
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_minimo || ''}
                          onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value ? Number(e.target.value) : 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-pirateRedDark mb-2">
                      Unidad de Medida
                    </label>
                    <select
                      value={formData.unidad_medida || 'unidad'}
                      onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                    >
                      <option value="unidad">Unidad</option>
                      <option value="kg">Kilogramo</option>
                      <option value="g">Gramo</option>
                      <option value="l">Litro</option>
                      <option value="ml">Mililitro</option>
                      <option value="m">Metro</option>
                      <option value="cm">Centímetro</option>
                      <option value="caja">Caja</option>
                      <option value="paquete">Paquete</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Configuraciones */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Configuraciones
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="destacado"
                      checked={formData.destacado || false}
                      onChange={(e) => setFormData({ ...formData, destacado: e.target.checked })}
                      className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                    />
                    <label htmlFor="destacado" className="ml-2 text-sm text-gray-700 flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Destacar producto
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="disponible_catalogo"
                      checked={formData.disponible_catalogo !== false}
                      onChange={(e) => setFormData({ ...formData, disponible_catalogo: e.target.checked })}
                      className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                    />
                    <label htmlFor="disponible_catalogo" className="ml-2 text-sm text-gray-700 flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      Mostrar en Catálogo Online
                    </label>
                  </div>
                </div>
              </div>

              {/* Receta / Insumos */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Receta / Insumos
                </h3>
                
                {/* Insumos actuales */}
                {productInsumos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-pirateRedDark mb-2">Insumos Requeridos:</h4>
                    <div className="space-y-2">
                      {productInsumos.map((pi) => (
                        <div key={pi.insumo_id} className="flex items-center justify-between p-2 bg-white rounded border border-pirateRed border-opacity-20">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-pirateRedDark">{pi.insumo?.nombre}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({pi.insumo?.unidad_medida})
                            </span>
                            {pi.insumo?.costo_unitario && (
                              <span className="text-xs text-gray-500 ml-2">
                                {formatCurrency(pi.insumo.costo_unitario)} / {pi.insumo?.unidad_medida}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={pi.cantidad_requerida}
                              onChange={(e) => updateInsumoQuantity(pi.insumo_id, Number(e.target.value))}
                              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
                            />
                            <button
                              type="button"
                              onClick={() => removeInsumo(pi.insumo_id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buscador de insumos */}
                <div>
                  <label className="block text-sm font-medium text-pirateRedDark mb-2">
                    Añadir Insumo
                  </label>
                  <input
                    type="text"
                    value={searchInsumo}
                    onChange={(e) => setSearchInsumo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                    placeholder="Buscar insumo..."
                  />
                  
                  {/* Lista de insumos filtrados */}
                  {searchInsumo && (
                    <div className="mt-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg">
                      {filteredInsumos.slice(0, 5).map((insumo) => (
                        <button
                          key={insumo.id}
                          type="button"
                          onClick={() => addInsumo(insumo)}
                          className="w-full p-2 text-left hover:bg-pirateRed hover:bg-opacity-10 border-b border-gray-200 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-pirateRedDark">{insumo.nombre}</div>
                          <div className="text-xs text-gray-500">
                            Stock: {insumo.stock_actual || 0} {insumo.unidad_medida}
                            {insumo.costo_unitario > 0 && (
                              <span className="ml-2">
                                Costo: {formatCurrency(insumo.costo_unitario)}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {filteredInsumos.length === 0 && (
                        <div className="p-2 text-sm text-gray-500">No se encontraron insumos</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Configuración de Estaciones de Cocina */}
              <div className="bg-boneWhite p-4 rounded-lg border border-pirateRed border-opacity-20">
                <h3 className="text-lg font-semibold text-pirateRedDark mb-4 flex items-center">
                  <ChefHat className="w-5 h-5 mr-2" />
                  Estaciones de Cocina
                </h3>

                <p className="text-sm text-gray-600 mb-4">
                  Selecciona las estaciones donde se prepara este producto. Puedes seleccionar múltiples estaciones si el producto requiere preparación en varias áreas.
                </p>

                {/* Selector de Estaciones */}
                <div className="space-y-3">
                  {estaciones.map((estacion) => {
                    const isSelected = productoEstaciones.find(pe => pe.estacion_id === estacion.id);

                    return (
                      <div key={estacion.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`estacion-${estacion.id}`}
                              checked={!!isSelected}
                              onChange={() => toggleEstacion(estacion.id)}
                              className="w-4 h-4 text-pirateRed border-gray-300 rounded focus:ring-pirateRed"
                            />
                            <label
                              htmlFor={`estacion-${estacion.id}`}
                              className="ml-2 text-sm font-medium cursor-pointer flex items-center"
                            >
                              <span
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: estacion.color }}
                              ></span>
                              {estacion.nombre}
                            </label>
                          </div>
                        </div>

                        {/* Configuración de la estación (solo si está seleccionada) */}
                        {isSelected && (
                          <div className="mt-3 pl-6 space-y-3 border-t pt-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Tiempo (min)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={isSelected.tiempo_preparacion}
                                  onChange={(e) => updateEstacionConfig(estacion.id, 'tiempo_preparacion', Number(e.target.value))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Complejidad (1-5)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={isSelected.complejidad}
                                  onChange={(e) => updateEstacionConfig(estacion.id, 'complejidad', Number(e.target.value))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pirateRed focus:border-pirateRed"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              El tiempo se multiplicará por la cantidad de productos en el pedido
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {estaciones.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-4">
                      No hay estaciones de cocina configuradas
                    </div>
                  )}
                </div>

                {productoEstaciones.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      Este producto generará {productoEstaciones.length} item{productoEstaciones.length > 1 ? 's' : ''} en cocina por cada unidad pedida
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Ejemplo: 3 unidades = {productoEstaciones.length * 3} items totales en el sistema de cocina
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {isSubmitting ? 'Guardando...' : (producto ? 'Actualizar' : 'Crear Producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}