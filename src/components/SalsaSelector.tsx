import React, { useState, useEffect } from 'react';
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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-pirateRed to-pirateRedDark">
          <h2 className="text-xl font-bold text-boneWhite flex items-center">
            <Droplets className="w-5 h-5 mr-2" />
            Seleccionar Salsas
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-boneWhite"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
          {/* Información del producto */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex gap-3">
              {producto?.imagenes_urls?.[0] && (
                <div className="w-16 h-16 bg-white rounded flex items-center justify-center flex-shrink-0 border border-gray-200">
                  <img src={producto.imagenes_urls[0]} alt={producto.nombre} className="w-full h-full object-cover rounded" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">{producto?.nombre}</h3>
                <p className="text-sm text-blue-700 mt-1">Precio: {formatCurrency(producto?.precio_regular || 0)}</p>
                <p className="text-sm text-blue-700">
                  Salsas: {minSalsas === maxSalsas ? minSalsas : `${minSalsas}-${maxSalsas}`}
                </p>
              </div>
            </div>
          </div>

          {/* Instrucciones dinámicas */}
          <div className={`border rounded-lg p-4 mb-6 ${
            necesitaMas ? 'bg-yellow-50 border-yellow-200' :
            tieneDemas ? 'bg-red-50 border-red-200' :
            puedeConfirmar ? 'bg-green-50 border-green-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start">
              <AlertCircle className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
                necesitaMas ? 'text-yellow-600' :
                tieneDemas ? 'text-red-600' :
                puedeConfirmar ? 'text-green-600' :
                'text-gray-600'
              }`} />
              <div>
                <h4 className={`font-semibold mb-1 ${
                  necesitaMas ? 'text-yellow-800' :
                  tieneDemas ? 'text-red-800' :
                  puedeConfirmar ? 'text-green-800' :
                  'text-gray-800'
                }`}>
                  {necesitaMas ? 'Selecciona más salsas' :
                   tieneDemas ? 'Demasiadas salsas seleccionadas' :
                   puedeConfirmar ? '¡Perfecto!' :
                   'Selección de Salsas'}
                </h4>
                <p className={`text-sm ${
                  necesitaMas ? 'text-yellow-700' :
                  tieneDemas ? 'text-red-700' :
                  puedeConfirmar ? 'text-green-700' :
                  'text-gray-700'
                }`}>
                  {minSalsas === maxSalsas
                    ? `Selecciona hasta ${maxSalsas} salsa${maxSalsas > 1 ? 's' : ''}.`
                    : `Selecciona entre ${minSalsas} y ${maxSalsas} salsas.`
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  necesitaMas ? 'text-yellow-600' :
                  tieneDemas ? 'text-red-600' :
                  puedeConfirmar ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  Seleccionadas: {salsasCount} {salsasCount >= minSalsas ? '✓' : `(mínimo ${minSalsas})`}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de salsas */}
          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-900">Salsas Disponibles:</h4>
            
            {salsasDisponibles.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay salsas disponibles</p>
                <p className="text-sm text-gray-400">Contacta al administrador para agregar salsas al menú</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {salsasDisponibles.map((salsa) => {
                  const isSelected = salsasSeleccionadas.find(s => s.id === salsa.id);
                  const canSelect = salsasSeleccionadas.length < maxSalsas || isSelected;
                  
                  return (
                    <button
                      key={salsa.id}
                      onClick={() => handleSalsaToggle(salsa)}
                      disabled={!canSelect}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        isSelected
                          ? 'border-pirateRed bg-pirateRed bg-opacity-10 text-pirateRedDark'
                          : canSelect
                          ? 'border-gray-300 hover:border-pirateRed hover:bg-pirateRed hover:bg-opacity-5'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium">{salsa.nombre}</h5>
                          {salsa.descripcion && (
                            <p className="text-sm text-gray-600 mt-1">{salsa.descripcion}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCurrency(salsa.precio_regular || 0)}
                          </p>
                        </div>
                        <div className="flex items-center ml-3">
                          {isSelected && (
                            <div className="w-6 h-6 bg-pirateRed rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-boneWhite" />
                            </div>
                          )}
                        </div>
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