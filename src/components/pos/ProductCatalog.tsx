import { Search, Grid3x3 as Grid3X3, List, Package, Tag } from 'lucide-react';
import { formatCurrency } from '../../lib/utils/formatters';
import { SimplifiedProductList } from '../SimplifiedProductList';
import { useCartStore } from '../../lib/store/cartStore';

interface ProductCatalogProps {
    productos: any[];
    categorias: any[];
    isLoading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedCategory: string;
    onCategoryChange: (value: string) => void;
    isSimplifiedView: boolean;
    onToggleView: (value: boolean) => void;
    onAddToCarrito: (producto: any) => void;
    carrito: any[];
    editingOrderId: number | null;
    onCancelEdition: () => void;
}

export const ProductCatalog = ({
    productos,
    categorias,
    isLoading,
    searchTerm,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    isSimplifiedView,
    onToggleView,
    onAddToCarrito,
    carrito,
    editingOrderId,
    onCancelEdition
}: ProductCatalogProps) => {
    const { updateCarritoQuantity, removeFromCarrito } = useCartStore();

    return (
        <div className="flex-1 lg:flex-[2] flex flex-col h-full overflow-hidden bg-gray-50/30">
            {/* Header Sticky con Glassmorphism */}
            <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-gray-200">
                <div className="p-4 sm:p-6 lg:px-8 lg:py-4">
                    {editingOrderId && (
                        <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-500 p-2 rounded-lg">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">Editando Pedido #{editingOrderId}</p>
                                    <p className="text-[10px] text-amber-700 font-medium">Los cambios actualizarán la orden actual</p>
                                </div>
                            </div>
                            <button
                                onClick={onCancelEdition}
                                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                                Cancelar Edición
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-pirateRed transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar delicias piratas..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-100/50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-pirateRed/20 focus:border-pirateRed transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => onToggleView(false)}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isSimplifiedView
                                        ? 'bg-white text-pirateRed shadow-sm scale-105'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Grid3X3 className="w-3.5 h-3.5 mr-1.5" />
                                    Catálogo
                                </button>
                                <button
                                    onClick={() => onToggleView(true)}
                                    className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSimplifiedView
                                        ? 'bg-white text-pirateRed shadow-sm scale-105'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <List className="w-3.5 h-3.5 mr-1.5" />
                                    Lista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {!isSimplifiedView && (
                    <div className="px-4 sm:px-6 lg:px-8 pb-4">
                        <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide mask-fade-right">
                            <button
                                onClick={() => onCategoryChange('')}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${selectedCategory === ''
                                    ? 'bg-pirateRed border-pirateRed text-white shadow-lg shadow-pirateRed/20 scale-105'
                                    : 'bg-white border-gray-100 text-gray-500 hover:border-pirateRed/30 hover:text-pirateRed'
                                    }`}
                            >
                                🔥 Todos
                            </button>
                            {categorias.map((categoria) => (
                                <button
                                    key={categoria.id}
                                    onClick={() => onCategoryChange(categoria.id.toString())}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${selectedCategory === categoria.id.toString()
                                        ? 'bg-pirateRed border-pirateRed text-white shadow-lg shadow-pirateRed/20 scale-105'
                                        : 'bg-white border-gray-100 text-gray-500 hover:border-pirateRed/30 hover:text-pirateRed'
                                        }`}
                                >
                                    {categoria.nombre}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
                {isSimplifiedView ? (
                    <SimplifiedProductList
                        productos={productos}
                        carrito={carrito}
                        onAddToCarrito={onAddToCarrito}
                        onUpdateQuantity={updateCarritoQuantity}
                        onRemoveFromCarrito={removeFromCarrito}
                        searchTerm={searchTerm}
                        onSearchChange={onSearchChange}
                    />
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-6">
                        {isLoading ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 grayscale opacity-50">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pirateRed mb-4"></div>
                                <span className="text-gray-500 font-medium">Cargando arsenal...</span>
                            </div>
                        ) : productos.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No hay tesoros aquí</h3>
                                <p className="text-gray-500 max-w-xs mx-auto">
                                    {searchTerm || selectedCategory
                                        ? 'Prueba con otros términos o categorías.'
                                        : 'El catálogo está vacío por ahora.'
                                    }
                                </p>
                            </div>
                        ) : (
                            productos.map((producto) => {
                                const precio = producto.precio_descuento && producto.precio_descuento > 0 ? producto.precio_descuento : producto.precio_regular || producto.precio || 0;
                                const enCarrito = carrito.find(item => item.producto_id === producto.id);

                                return (
                                    <div
                                        key={producto.id}
                                        className={`group relative bg-white rounded-2xl p-3 sm:p-4 hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 overflow-hidden ${enCarrito
                                            ? 'border-pirateRed bg-pirateRed/5 shadow-xl shadow-pirateRed/10 -translate-y-1'
                                            : 'border-transparent shadow-sm hover:border-pirateRed/20 hover:-translate-y-1'
                                            }`}
                                        onClick={() => onAddToCarrito(producto)}
                                    >
                                        <div className="aspect-square rounded-xl mb-4 flex items-center justify-center overflow-hidden bg-gray-50 relative group-hover:scale-105 transition-transform duration-500">
                                            {producto.imagenes_urls && producto.imagenes_urls[0] ? (
                                                <img src={producto.imagenes_urls[0]} alt={producto.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-10 h-10 text-gray-200" />
                                            )}

                                            {/* Badge de cantidad si está en carrito */}
                                            {enCarrito && (
                                                <div className="absolute top-2 right-2 bg-pirateRed text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-lg animate-bounce">
                                                    {enCarrito.cantidad}
                                                </div>
                                            )}

                                            {/* Overlay rápido al hacer hover */}
                                            <div className="absolute inset-0 bg-pirateRed/0 group-hover:bg-pirateRed/10 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                    <span className="bg-white text-pirateRed font-black px-4 py-2 rounded-xl shadow-xl text-xs uppercase tracking-wider">
                                                        Agregar +
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <h3 className="font-bold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem] leading-tight group-hover:text-pirateRed transition-colors">
                                                {producto.nombre}
                                            </h3>

                                            <div className="flex items-end justify-between pt-1">
                                                <div className="flex flex-col">
                                                    {producto.precio_descuento && producto.precio_descuento > 0 ? (
                                                        <>
                                                            <span className="text-[10px] text-gray-400 line-through mb-[-2px]">{formatCurrency(producto.precio_regular)}</span>
                                                            <span className="text-base font-black text-green-600">{formatCurrency(producto.precio_descuento)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-base font-black text-gray-900">{formatCurrency(precio)}</span>
                                                    )}
                                                </div>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${enCarrito ? 'bg-pirateRed text-white rotate-90 scale-110' : 'bg-gray-100 text-gray-400 group-hover:bg-pirateRed group-hover:text-white'
                                                    }`}>
                                                    <Tag className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
