import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Droplets, Package } from 'lucide-react';
import { useProductosStore } from '../lib/store/productosStore';
import { formatCurrency } from '../lib/utils/formatters';

interface SalsaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  producto: any;
  onConfirm: (salsasSeleccionadas: any[]) => void;
  initialSelection?: any[];
}

export function SalsaSelector({ isOpen, onClose, producto, onConfirm, initialSelection = [] }: SalsaSelectorProps) {
  const { productos } = useProductosStore();
  const [salsasSeleccionadas, setSalsasSeleccionadas] = useState<any[]>(initialSelection);
  const [salsasDisponibles, setSalsasDisponibles] = useState<any[]>([]);

  // Obtener configuración de salsas del producto
  const minSalsas = producto?.min_salsas || 1;
  const maxSalsas = producto?.max_salsas || 1;

  useEffect(() => {
    if (isOpen && producto) {
      console.log('🔍 SalsaSelector - Producto recibido:', {
        nombre: producto.nombre,
        requiere_salsas: producto.requiere_salsas,
        min_salsas: producto.min_salsas,
        max_salsas: producto.max_salsas
      });

      // Buscar productos de la categoría "Salsas"
      const salsas = productos.filter(p => {
        const categoria = p.categoria?.nombre?.toLowerCase() || '';
        const esSalsa = categoria.includes('salsa');
        const esActivo = p.activo !== false;
        const esDisponible = p.disponible_catalogo !== false;

        console.log('🧪 Verificando producto para salsas:', {
          nombre: p.nombre,
          categoria: categoria,
          esSalsa,
          esActivo,
          esDisponible
        });

        return esSalsa && esActivo && esDisponible;
      });

      console.log('🍯 Salsas encontradas:', salsas.length, salsas.map(s => s.nombre));
      setSalsasDisponibles(salsas);
      // Establecer la selección inicial cuando el modal se abre
      setSalsasSeleccionadas(initialSelection);
    }
  }, [isOpen, productos, producto, initialSelection]);

  const handleSalsaToggle = (salsa: any) => {
    const yaSeleccionada = salsasSeleccionadas.find(s => s.id === salsa.id);

    if (yaSeleccionada) {
      // Remover salsa
      setSalsasSeleccionadas(salsasSeleccionadas.filter(s => s.id !== salsa.id));
    } else {
      // Agregar salsa si no se ha alcanzado el límite
      if (salsasSeleccionadas.length < maxSalsas) {
        setSalsasSeleccionadas([...salsasSeleccionadas, {
          id: salsa.id,
          nombre: salsa.nombre,
          precio: salsa.precio_regular || 0
        }]);
      }
    }
  };

  const handleConfirm = () => {
    const salsasCount = salsasSeleccionadas.length;

    if (salsasCount >= minSalsas) {
      console.log('✅ Confirmando salsas:', salsasSeleccionadas);
      onConfirm(salsasSeleccionadas);
      onClose();
    }
  };

  const handleClose = () => {
    setSalsasSeleccionadas([]);
    onClose();
  };

  const salsasCount = salsasSeleccionadas.length;
  const puedeConfirmar = salsasCount >= minSalsas;
  const necesitaMas = salsasCount < minSalsas;
  const tieneDemas = false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
        {/* Header */}
        {/* Header Compacto */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-pirateRed to-pirateRedDark">
          <h2 className="text-lg font-black text-boneWhite flex items-center">
            <Droplets className="w-4 h-4 mr-2" />
            Seleccionar Salsas
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-boneWhite"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
          {/* Información del producto compacta */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-4">
            <div className="flex gap-3 items-center">
              {producto?.imagenes_urls?.[0] && (
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100 overflow-hidden">
                  <img src={producto.imagenes_urls[0]} alt={producto.nombre} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-blue-900 text-sm truncate">{producto?.nombre}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                    Salsas: {minSalsas === maxSalsas ? minSalsas : `${minSalsas}-${maxSalsas}`}
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium">{formatCurrency(producto?.precio_regular || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones dinámicas ultra-compactas */}
          <div className={`border rounded-xl p-2.5 mb-4 ${necesitaMas ? 'bg-amber-50 border-amber-200' :
            tieneDemas ? 'bg-red-50 border-red-200' :
              puedeConfirmar ? 'bg-green-50 border-green-200' :
                'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${necesitaMas ? 'text-amber-600' :
                tieneDemas ? 'text-red-600' :
                  puedeConfirmar ? 'text-green-600' :
                    'text-gray-600'
                }`} />
              <div className="flex-1 flex justify-between items-center">
                <p className={`text-[11px] font-bold ${necesitaMas ? 'text-amber-800' :
                  tieneDemas ? 'text-red-800' :
                    puedeConfirmar ? 'text-green-800' :
                      'text-gray-800'
                  }`}>
                  {necesitaMas ? `Falta${minSalsas - salsasCount > 1 ? 'n' : ''} ${minSalsas - salsasCount} salsa${minSalsas - salsasCount > 1 ? 's' : ''}` :
                    tieneDemas ? 'Demasiadas salsas' :
                      '¡Selección lista!'}
                </p>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${puedeConfirmar ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                  {salsasCount}/{maxSalsas}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de salsas densa */}
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Disponibles</h4>

            {salsasDisponibles.length === 0 ? (
              <div className="text-center py-6">
                <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No hay salsas disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {salsasDisponibles.map((salsa) => {
                  const isSelected = salsasSeleccionadas.find(s => s.id === salsa.id);
                  const canSelect = salsasSeleccionadas.length < maxSalsas || isSelected;

                  return (
                    <button
                      key={salsa.id}
                      onClick={() => handleSalsaToggle(salsa)}
                      disabled={!canSelect}
                      className={`p-2.5 border rounded-xl transition-all text-left flex items-center justify-between ${isSelected
                        ? 'border-pirateRed bg-pirateRed/5 shadow-sm'
                        : canSelect
                          ? 'border-gray-100 hover:border-pirateRed/30'
                          : 'border-gray-50 bg-gray-50/50 text-gray-300 cursor-not-allowed opacity-50'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className={`font-bold text-sm ${isSelected ? 'text-pirateRed' : 'text-gray-700'}`}>{salsa.nombre}</h5>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {formatCurrency(salsa.precio_regular || 0)}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-pirateRed border-pirateRed scale-110 shadow-sm' : 'border-gray-200'
                        }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Botones */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!puedeConfirmar}
            className="px-6 py-2 bg-pirateRed text-boneWhite rounded-lg hover:bg-pirateRedDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar
          </button>
        </div>
      </div>

    </div>
  );
}