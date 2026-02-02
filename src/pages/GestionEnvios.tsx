import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Navigation,
  Edit,
  ToggleLeft,
  ToggleRight,
  MapPin,
  DollarSign,
  Gift,
  Search,
  Filter,
  Clock,
  CheckCircle,
  Package,
  User,
  Phone,
  CreditCard,
  Banknote,
  Smartphone,
  UserPlus,
  AlertCircle
} from 'lucide-react';
import { usePedidosStore, ZonaEntrega } from '../lib/store/pedidosStore';
import { useAsignacionesStore } from '../lib/store/asignacionesStore';
import { supabase } from '../lib/supabase/client';
import { ZonaFormModal } from '../components/ZonaFormModal';
import { AsignarRepartidorModal } from '../components/AsignarRepartidorModal';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import toast from 'react-hot-toast';

// Fix para los iconos de Leaflet en React
// delete (L.Icon.Default.prototype as any)._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
//   iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
//   shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
// });

// Componente para gestión de zonas
function ZonasManager() {
  const { zonasEntrega, fetchZonasEntrega, updateZona } = usePedidosStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zonaToEdit, setZonaToEdit] = useState<ZonaEntrega | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchZonasEntrega(true); // Cargar todas las zonas, incluidas las inactivas
  }, [fetchZonasEntrega]);

  const handleOpenModal = (zona?: ZonaEntrega) => {
    setZonaToEdit(zona || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setZonaToEdit(null);
  };

  const handleToggleActive = async (zona: ZonaEntrega) => {
    try {
      await updateZona(zona.id, { activa: !zona.activa });
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const filteredZonas = zonasEntrega.filter(zona => {
    const matchesSearch = zona.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = showInactive || zona.activa !== false;
    return matchesSearch && matchesActive;
  });

  const estadisticas = {
    total: zonasEntrega.length,
    activas: zonasEntrega.filter(z => z.activa !== false).length,
    inactivas: zonasEntrega.filter(z => z.activa === false).length,
    conEnvioGratis: zonasEntrega.filter(z => z.monto_minimo_envio_gratis).length,
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Zonas</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ToggleRight className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Activas</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.activas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ToggleLeft className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Inactivas</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.inactivas}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Con Envío Gratis</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.conEnvioGratis}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar zonas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between md:justify-end space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showInactive" className="ml-2 text-sm text-gray-700">
                Mostrar inactivas
              </label>
            </div>
            
            <div className="text-sm text-gray-500 flex items-center">
              <Filter className="w-4 h-4 mr-1" />
              {filteredZonas.length} zonas
            </div>

            <button 
              onClick={() => handleOpenModal()} 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Zona
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Zonas */}
      {filteredZonas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay zonas de entrega</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'No se encontraron zonas con los criterios de búsqueda.' : 'Comienza creando tu primera zona de entrega.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Zona
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo de Envío
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Envío Gratis Desde
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
                {filteredZonas.map(zona => (
                  <tr key={zona.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{zona.nombre}</div>
                          <div className="text-sm text-gray-500">ID: {zona.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(zona.costo)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {zona.monto_minimo_envio_gratis ? (
                        <div className="flex items-center">
                          <Gift className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-sm text-gray-900">
                            {formatCurrency(zona.monto_minimo_envio_gratis)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No aplica</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        zona.activa !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {zona.activa !== false ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenModal(zona)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar zona"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(zona)}
                          className={`p-2 rounded-lg transition-colors ${
                            zona.activa !== false
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={zona.activa !== false ? 'Desactivar zona' : 'Activar zona'}
                        >
                          {zona.activa !== false ? (
                            <ToggleLeft className="w-4 h-4" />
                          ) : (
                            <ToggleRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredZonas.map(zona => (
              <div key={zona.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {zona.nombre}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(zona.costo)}
                        </span>
                        {zona.monto_minimo_envio_gratis && (
                          <span className="flex items-center">
                            <Gift className="w-3 h-3 mr-1" />
                            Gratis desde {formatCurrency(zona.monto_minimo_envio_gratis)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      zona.activa !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {zona.activa !== false ? 'Activa' : 'Inactiva'}
                    </span>
                    
                    <button
                      onClick={() => handleOpenModal(zona)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar zona"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleToggleActive(zona)}
                      className={`p-2 rounded-lg transition-colors ${
                        zona.activa !== false
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={zona.activa !== false ? 'Desactivar zona' : 'Activar zona'}
                    >
                      {zona.activa !== false ? (
                        <ToggleLeft className="w-4 h-4" />
                      ) : (
                        <ToggleRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Modal */}
      <ZonaFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        zonaToEdit={zonaToEdit} 
      />
    </div>
  );
}

// Componente para entregas pendientes
function EntregasPendientes() {
  const {
    pedidosParaEntrega,
    fetchPedidosParaEntrega,
    updatePedidoTimestamp,
    updatePedidoStatus,
    estadosPedido,
    isLoading,
    subscribeToPedidosChanges
  } = usePedidosStore();

  const {
    asignaciones,
    repartidores,
    fetchAsignaciones,
    fetchRepartidoresDisponibles,
    asignarRepartidor,
    subscribeToAsignacionesChanges
  } = useAsignacionesStore();

  const [modalAsignarOpen, setModalAsignarOpen] = useState(false);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<{ id: number; pedidoNumero: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroRepartidor, setFiltroRepartidor] = useState<string>('todos');
  const [ordenamiento, setOrdenamiento] = useState<'reciente' | 'antiguo' | 'urgente'>('urgente');

  // Estado para los marcadores del mapa
  // const [marcadores, setMarcadores] = useState<Array<{
  //   id: number;
  //   coords: [number, number];
  //   pedido: any;
  // }>>([]);
  // const [geocodificando, setGeocodificando] = useState(false);

  // Función de geocodificación usando Nominatim (OpenStreetMap)
  // const geocodificarDireccion = async (pedido: any): Promise<[number, number] | null> => {
  //   try {
      // Construir la cadena de consulta
  //     let addressString = '';
      
      // Prioridad 1: Si tiene Plus Code, usarlo como consulta principal
  //     if (pedido.direccion_envio?.plus_code) {
  //       const plusCode = pedido.direccion_envio.plus_code.trim();
        // Validar formato básico del Plus Code
  //       if (/^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}$/.test(plusCode)) {
  //         addressString = `${plusCode}`;
          // Añadir contexto de ciudad y país si están disponibles
  //         if (pedido.direccion_envio.ciudad) {
  //           addressString += ` ${pedido.direccion_envio.ciudad}`;
  //         }
  //         addressString += ' México';
  //         console.log('Usando Plus Code para geocodificación:', addressString);
  //       } else {
  //         console.warn('Plus Code con formato inválido:', plusCode);
  //       }
  //     }
      
      // Prioridad 2: Si no hay Plus Code válido, usar dirección de texto
  //     if (!addressString) {
  //       const direccion = pedido.direccion_envio;
  //       addressString = typeof direccion === 'string' 
  //         ? direccion 
  //         : `${direccion?.calle || ''} ${direccion?.ciudad || ''} México`.trim();
  //       console.log('Usando dirección de texto para geocodificación:', addressString);
  //     }

  //     if (!addressString || addressString === 'México') {
  //       console.log('No hay dirección válida para geocodificar');
  //       return null;
  //     }

      // Llamada a la API de Nominatim
  //     const response = await fetch(
  //       `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1&countrycodes=mx`
  //     );
      
  //     if (!response.ok) {
  //       throw new Error('Error en la respuesta de Nominatim');
  //     }
      
  //     const data = await response.json();
      
  //     if (data && data.length > 0) {
  //       const lat = parseFloat(data[0].lat);
  //       const lon = parseFloat(data[0].lon);
  //       console.log(`Geocodificación exitosa para "${addressString}":`, [lat, lon]);
  //       return [lat, lon];
  //     } else {
  //       console.log(`No se encontraron coordenadas para: "${addressString}"`);
  //     }
      
  //     return null;
  //   } catch (error) {
  //     console.error('Error en geocodificación:', error);
  //     return null;
  //   }
  // };

  // Procesar pedidos para obtener coordenadas
  // useEffect(() => {
  //   const procesarPedidos = async () => {
  //     if (pedidosParaEntrega.length === 0) {
  //       setMarcadores([]);
  //       return;
  //     }

  //     setGeocodificando(true);
  //     const nuevosMarcadores = [];
      
  //     for (const pedido of pedidosParaEntrega) {
  //       if (pedido.direccion_envio) {
          // Añadir un pequeño delay para no sobrecargar la API
  //         await new Promise(resolve => setTimeout(resolve, 100));
          
  //         const coords = await geocodificarDireccion(pedido);
  //         if (coords) {
  //           nuevosMarcadores.push({
  //             id: pedido.id,
  //             coords,
  //             pedido: pedido
  //           });
  //         }
  //       }
  //     }
      
  //     setMarcadores(nuevosMarcadores);
  //     setGeocodificando(false);
  //   };

  //   procesarPedidos();
  // }, [pedidosParaEntrega]);

  useEffect(() => {
    const cargarDatos = async () => {
      await fetchPedidosParaEntrega();
      await fetchAsignaciones();
      await fetchRepartidoresDisponibles();
    };

    cargarDatos();

    const pedidosSubscription = subscribeToPedidosChanges();
    const asignacionesSubscription = subscribeToAsignacionesChanges();

    return () => {
      supabase.removeChannel(pedidosSubscription);
      supabase.removeChannel(asignacionesSubscription);
    };
  }, [fetchPedidosParaEntrega, fetchAsignaciones, fetchRepartidoresDisponibles]);

  const handleUpdateStatus = async (pedidoId: number, campo: 'fecha_listo_para_entrega' | 'fecha_en_ruta' | 'fecha_entregado') => {
    await updatePedidoTimestamp(pedidoId, campo);
  };

  const getEstadoEntrega = (pedido: any) => {
    if (pedido.fecha_entregado) return { text: 'Entregado', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    if (pedido.fecha_en_ruta) return { text: 'En Ruta', color: 'bg-blue-100 text-blue-800', icon: Navigation };
    if (pedido.fecha_listo_para_entrega) return { text: 'Listo', color: 'bg-yellow-100 text-yellow-800', icon: Package };
    return { text: 'Preparando', color: 'bg-gray-100 text-gray-800', icon: Clock };
  };

  const getAsignacionPedido = (pedidoId: number) => {
    const pedidoIdNum = Number(pedidoId);
    return asignaciones.find(a => Number(a.pedido_id) === pedidoIdNum);
  };

  const getMetodoPagoInfo = (metodoPago?: string) => {
    switch (metodoPago?.toLowerCase()) {
      case 'efectivo':
        return { icon: Banknote, text: 'Efectivo', color: 'bg-green-100 text-green-800' };
      case 'tarjeta':
        return { icon: CreditCard, text: 'Tarjeta', color: 'bg-blue-100 text-blue-800' };
      case 'transferencia':
        return { icon: Smartphone, text: 'Transferencia', color: 'bg-purple-100 text-purple-800' };
      default:
        return { icon: DollarSign, text: metodoPago || 'No especificado', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleAbrirModalAsignar = (asignacionId: number, pedidoNumero: string) => {
    setAsignacionSeleccionada({ id: asignacionId, pedidoNumero });
    setModalAsignarOpen(true);
  };

  const handleCerrarModalAsignar = () => {
    setModalAsignarOpen(false);
    setAsignacionSeleccionada(null);
  };

  const handleAsignarRapido = async (pedidoId: number, asignacionId: number | undefined, repartidorId: string) => {
    try {
      let finalAsignacionId = asignacionId;

      // Si no existe asignación, crearla primero
      if (!asignacionId) {
        const { data: user } = await supabase.auth.getUser();

        const { data: nuevaAsignacion, error: errorCrear } = await supabase
          .from('asignaciones_entrega')
          .insert({
            pedido_id: pedidoId,
            repartidor_id: null,
            estado: 'pendiente',
            insert_by_user: user.user?.id
          })
          .select()
          .single();

        if (errorCrear) {
          throw new Error('No se pudo crear la asignación');
        }

        finalAsignacionId = nuevaAsignacion.id;
        await fetchAsignaciones();
      }

      // Asignar el repartidor
      await asignarRepartidor(finalAsignacionId!, repartidorId);
    } catch (error) {
      console.error('Error al asignar repartidor:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'No se pudo asignar'}`);
    }
  };

  const calcularTiempoEspera = (fechaCreacion: string) => {
    const ahora = new Date();
    const creacion = new Date(fechaCreacion);
    const minutos = Math.floor((ahora.getTime() - creacion.getTime()) / 60000);
    return minutos;
  };

  const esUrgente = (pedido: any) => {
    const minutosEspera = calcularTiempoEspera(pedido.insert_date);
    return minutosEspera > 45;
  };

  const pedidosFiltrados = pedidosParaEntrega.filter(pedido => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchId = pedido.id?.toString().includes(search);
      const matchCliente = pedido.cliente_nombre?.toLowerCase().includes(search);
      const matchTelefono = pedido.cliente_telefono?.includes(search);
      if (!matchId && !matchCliente && !matchTelefono) return false;
    }

    if (filtroEstado !== 'todos') {
      const estado = getEstadoEntrega(pedido).text.toLowerCase();
      if (estado !== filtroEstado.toLowerCase()) return false;
    }

    if (filtroRepartidor !== 'todos') {
      const asignacion = getAsignacionPedido(pedido.id);
      if (filtroRepartidor === 'sin_asignar') {
        if (asignacion?.repartidor_id) return false;
      } else {
        if (asignacion?.repartidor_id?.toString() !== filtroRepartidor) return false;
      }
    }

    return true;
  });

  const pedidosOrdenados = [...pedidosFiltrados].sort((a, b) => {
    switch (ordenamiento) {
      case 'antiguo':
        return new Date(a.insert_date).getTime() - new Date(b.insert_date).getTime();
      case 'reciente':
        return new Date(b.insert_date).getTime() - new Date(a.insert_date).getTime();
      case 'urgente':
        const urgenciaA = esUrgente(a) ? 1 : 0;
        const urgenciaB = esUrgente(b) ? 1 : 0;
        if (urgenciaB !== urgenciaA) return urgenciaB - urgenciaA;
        return new Date(a.insert_date).getTime() - new Date(b.insert_date).getTime();
      default:
        return 0;
    }
  });

  const repartidoresUnicos = Array.from(
    new Set(
      asignaciones
        .filter(a => a.repartidor)
        .map(a => JSON.stringify({ id: a.repartidor_id, nombre: a.repartidor?.nombre }))
    )
  ).map(str => JSON.parse(str));

  const estadisticas = {
    total: pedidosParaEntrega.length,
    preparando: pedidosParaEntrega.filter(p => !p.fecha_listo_para_entrega).length,
    listos: pedidosParaEntrega.filter(p => p.fecha_listo_para_entrega && !p.fecha_en_ruta).length,
    enRuta: pedidosParaEntrega.filter(p => p.fecha_en_ruta && !p.fecha_entregado).length,
  };

  // Centro del mapa (Ciudad de México)
  const centroMapa: [number, number] = [19.4326, -99.1332];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por pedido, cliente o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="preparando">Preparando</option>
              <option value="listo">Listo</option>
              <option value="en ruta">En Ruta</option>
              <option value="entregado">Entregado</option>
            </select>

            <select
              value={filtroRepartidor}
              onChange={(e) => setFiltroRepartidor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="todos">Todos los repartidores</option>
              <option value="sin_asignar">Sin asignar</option>
              {repartidoresUnicos.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.nombre}
                </option>
              ))}
            </select>

            <select
              value={ordenamiento}
              onChange={(e) => setOrdenamiento(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="urgente">Más urgentes</option>
              <option value="antiguo">Más antiguos</option>
              <option value="reciente">Más recientes</option>
            </select>
          </div>
        </div>

        {(searchTerm || filtroEstado !== 'todos' || filtroRepartidor !== 'todos') && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <p className="text-gray-600">
              Mostrando {pedidosOrdenados.length} de {pedidosParaEntrega.length} entregas
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroEstado('todos');
                setFiltroRepartidor('todos');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas de entregas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Entregas</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Preparando</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.preparando}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Listos</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.listos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">En Ruta</p>
              <p className="text-xl font-bold text-gray-900">{estadisticas.enRuta}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de entregas */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Mapa de Entregas Pendientes
          {geocodificando && (
            <div className="ml-2 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-blue-600">Geocodificando...</span>
            </div>
          )}
        </h3>
        
        <div className="h-96 rounded-lg overflow-hidden border border-gray-300">
          <MapContainer
            center={centroMapa}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {marcadores.map((marcador) => (
              <Marker key={marcador.id} position={marcador.coords}>
                <Popup>
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900">
                      Pedido #{marcador.pedido.id}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {marcador.pedido.cliente_nombre || 'Sin cliente'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatCurrency(marcador.pedido.total || 0)}
                    </p>
                    {marcador.pedido.direccion_envio && (
                      <p className="text-xs text-gray-500 mt-1">
                        {marcador.pedido.direccion_envio.calle}
                        {marcador.pedido.direccion_envio.ciudad && 
                          `, ${marcador.pedido.direccion_envio.ciudad}`
                        }
                        {marcador.pedido.direccion_envio?.plus_code && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            📍 {marcador.pedido.direccion_envio.plus_code}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        
        {marcadores.length === 0 && pedidosParaEntrega.length > 0 && !geocodificando && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              No se pudieron geocodificar las direcciones de entrega. 
              Verifica que las direcciones estén completas y sean válidas.
            </p>
          </div>
        )}
        
        {marcadores.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Mostrando {marcadores.length} de {pedidosParaEntrega.length} entregas en el mapa.
            </p>
          </div>
        )}
      </div> */}

      {/* Lista de entregas pendientes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando entregas...</span>
        </div>
      ) : pedidosParaEntrega.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entregas pendientes</h3>
          <p className="text-gray-500">
            Todas las entregas han sido completadas o no hay pedidos a domicilio.
          </p>
        </div>
      ) : pedidosOrdenados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entregas con estos filtros</h3>
          <p className="text-gray-500">
            Intenta cambiar los filtros de búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosOrdenados.map((pedido) => {
            const estadoEntrega = getEstadoEntrega(pedido);
            const IconComponent = estadoEntrega.icon;
            const asignacion = getAsignacionPedido(pedido.id);
            const metodoPagoInfo = getMetodoPagoInfo(pedido.metodo_pago);
            const MetodoPagoIcon = metodoPagoInfo.icon;
            const urgente = esUrgente(pedido);
            const minutosEspera = calcularTiempoEspera(pedido.insert_date);

            return (
              <div key={pedido.id} className={`bg-white rounded-lg shadow-sm p-4 md:p-6 ${urgente ? 'border-2 border-red-500' : 'border border-gray-200'}`}>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start md:items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${urgente ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <Package className={`w-6 h-6 ${urgente ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Pedido #{pedido.id}
                            </h3>
                            {urgente && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                URGENTE
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(pedido.insert_date || new Date())}
                            <span className={`ml-2 ${urgente ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                              ({minutosEspera} min esperando)
                            </span>
                          </p>
                        </div>

                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoEntrega.color} mt-2 md:mt-0`}>
                          <IconComponent className="w-3 h-3 mr-1" />
                          {estadoEntrega.text}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {pedido.cliente_nombre || 'Sin cliente'}
                            </span>
                            {pedido.cliente_telefono && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Phone className="w-3 h-3 mr-1" />
                                {pedido.cliente_telefono}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(pedido.total || 0)}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${metodoPagoInfo.color}`}>
                            <MetodoPagoIcon className="w-3 h-3 mr-1" />
                            {metodoPagoInfo.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {pedido.direccion_envio && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {pedido.direccion_envio.calle}
                            {pedido.direccion_envio.ciudad && `, ${pedido.direccion_envio.ciudad}`}
                          </p>
                          {pedido.direccion_envio.referencias && (
                            <p className="text-xs text-blue-700 mt-1">
                              <strong>Ref:</strong> {pedido.direccion_envio.referencias}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`p-3 rounded-lg border ${asignacion?.repartidor_id ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center flex-1">
                        <Truck className={`w-4 h-4 mr-2 ${asignacion?.repartidor_id ? 'text-green-600' : 'text-orange-600'}`} />
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${asignacion?.repartidor_id ? 'text-green-700' : 'text-orange-700'}`}>
                            {asignacion?.repartidor_id ? 'Repartidor Asignado' : 'Asignar Repartidor'}
                          </p>
                          {asignacion?.repartidor ? (
                            <div>
                              <p className="text-sm font-semibold text-green-900">
                                {asignacion.repartidor.nombre}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-orange-600">Selecciona un repartidor disponible</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={asignacion?.repartidor_id || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAsignarRapido(pedido.id, asignacion?.id, e.target.value);
                            }
                          }}
                          className={`text-sm px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            asignacion?.repartidor_id
                              ? 'bg-white border-green-300 text-gray-900'
                              : 'bg-orange-100 border-orange-300 text-orange-900 font-medium'
                          }`}
                          disabled={repartidores.length === 0}
                        >
                          <option value="">
                            {repartidores.length === 0 ? 'No hay repartidores' : (asignacion?.repartidor_id ? 'Cambiar' : 'Seleccionar')}
                          </option>
                          {repartidores.filter(r => r.activo).map((rep) => (
                            <option key={rep.id} value={rep.id}>
                              {rep.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {pedido.notas_entrega && (
                    <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        <strong>Notas:</strong> {pedido.notas_entrega}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {!pedido.fecha_listo_para_entrega && (
                      <button
                        onClick={() => handleUpdateStatus(pedido.id!, 'fecha_listo_para_entrega')}
                        className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-xs rounded-md hover:bg-yellow-700 transition-colors"
                      >
                        <Package className="w-3 h-3 mr-1" />
                        Marcar Listo
                      </button>
                    )}

                    {pedido.fecha_listo_para_entrega && !pedido.fecha_en_ruta && (
                      <button
                        onClick={async () => {
                          const estadoEnReparto = estadosPedido.find(e => e.nombre === 'En Reparto');
                          if (estadoEnReparto) {
                            try {
                              await updatePedidoStatus(pedido.id!, estadoEnReparto.id);
                              toast.success(`Pedido #${pedido.id} enviado a reparto`);
                            } catch (error) {
                              console.error('Error al cambiar estado:', error);
                              toast.error('No se pudo actualizar el estado');
                              return;
                            }
                          }
                          handleUpdateStatus(pedido.id!, 'fecha_en_ruta');
                        }}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Enviar a Reparto
                      </button>
                    )}

                    {pedido.fecha_en_ruta && !pedido.fecha_entregado && (
                      <button
                        onClick={() => handleUpdateStatus(pedido.id!, 'fecha_entregado')}
                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Entregado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {asignacionSeleccionada && (
        <AsignarRepartidorModal
          isOpen={modalAsignarOpen}
          onClose={handleCerrarModalAsignar}
          asignacionId={asignacionSeleccionada.id}
          pedidoNumero={asignacionSeleccionada.pedidoNumero}
        />
      )}
    </div>
  );
}

// Componente principal con pestañas
export function GestionEnvios() {
  const [activeTab, setActiveTab] = useState<'zonas' | 'entregas'>('zonas');

  const tabs = [
    { id: 'zonas', label: 'Zonas de Entrega', icon: MapPin },
    { id: 'entregas', label: 'Entregas Pendientes', icon: Truck },
  ];

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Truck className="w-8 h-8 mr-3 text-blue-600" />
          Gestión de Envíos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configura tus zonas de entrega y monitorea las entregas pendientes.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'zonas' | 'entregas')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'zonas' ? <ZonasManager /> : <EntregasPendientes />}
      </div>
    </div>
  );
}