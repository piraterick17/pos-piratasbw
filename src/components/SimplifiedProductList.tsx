import React from 'react';
import { Plus, Minus, X, Package, Search } from 'lucide-react';
import { formatCurrency } from '../lib/utils/formatters';

interface SimplifiedProductListProps {
  productos: any[];
  carrito: any[];
  onAddToCarrito: (producto: any) => void;
  onUpdateQuantity: (itemId: string, cantidad: number) => void;
  onRemoveFromCarrito: (itemId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function SimplifiedProductList({
  productos,
  carrito,
  onAddToCarrito,
  onUpdateQuantity,
  onRemoveFromCarrito,
  searchTerm,
  onSearchChange
}: SimplifiedProductListProps) {
  const getProductoEnCarrito = (productoId: number) => {
    return carrito.find(item => item.producto_id === productoId);
  };

  const handleQuickAdd = (producto: any, cantidad: number = 1) => {
    const enCarrito = getProductoEnCarrito(producto.id);
    if (enCarrito) {
      onUpdateQuantity(producto.id, enCarrito.cantidad + cantidad);
    } else {
      // Añadir múltiples veces si es necesario
      for (let i = 0; i < cantidad; i++) {
        onAddToCarrito(producto);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-300">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-pirateRed to-pirateRedDark">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar productos por nombre o código..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-pirateRed bg-boneWhite placeholder-gray-500"
            autoFocus
          />
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-boneWhite sticky top-0 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-24">
                Precio
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-32">
                En Carrito
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-pirateRed uppercase tracking-wider w-40">
                Acciones Rápidas
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
                  </p>
                </td>
              </tr>
            ) : (
              productos.map((producto) => {
                const precio = producto.precio_descuento && producto.precio_descuento > 0 
                  ? producto.precio_descuento 
                  : producto.precio_regular || producto.precio || 0;
                
                const enCarrito = getProductoEnCarrito(producto.id);
                
                // Verificar si requiere salsas desde la configuración del producto
                const requiereSalsas = producto.requiere_salsas === true;
                
                return (
                  <tr 
                    key={producto.id} 
                    className={`hover:bg-pirateRed hover:bg-opacity-5 cursor-pointer transition-colors ${
                      enCarrito ? 'bg-pirateRed bg-opacity-10' : ''
                    }`}
                    onClick={() => onAddToCarrito(producto)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-pirateRedDark line-clamp-2">
                          {producto.nombre}
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
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {producto.precio_descuento && producto.precio_descuento > 0 ? (
                          <div>
                            <span className="text-green-600 font-bold text-sm">
                              {formatCurrency(producto.precio_descuento)}
                            </span>
                            <div className="text-xs text-gray-500 line-through">
                              {formatCurrency(producto.precio_regular)}
                            </div>
                          </div>
                        ) : (
                          formatCurrency(precio)
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      {enCarrito ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(enCarrito.id, enCarrito.cantidad - 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <span className="text-sm font-bold w-8 text-center text-pirateRedDark">
                            {enCarrito.cantidad}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(enCarrito.id, enCarrito.cantidad + 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFromCarrito(enCarrito.id);
                            }}
                            className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1 flex-wrap gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(producto, 1);
                          }}
                          className="px-2 py-1 text-xs bg-pirateRed bg-opacity-10 text-pirateRed rounded hover:bg-pirateRed hover:bg-opacity-20 transition-colors font-medium"
                        >
                          +1
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(producto, 5);
                          }}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
                        >
                          +5
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(producto, 10);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium hidden sm:inline-block"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con información */}
      <div className="p-4 border-t border-gray-200 bg-boneWhite">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-pirateRed space-y-1 sm:space-y-0">
          <span>{productos.length} productos disponibles</span>
          <span>Haz clic en una fila para añadir al carrito</span>
        </div>
      </div>
    </div>
  );
}