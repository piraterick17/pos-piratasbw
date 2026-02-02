import React, { useEffect, useState } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  DollarSign,
  Package,
  Navigation,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Banknote,
  CreditCard,
  Smartphone,
  User
} from 'lucide-react';
import { useAsignacionesStore, AsignacionEntrega } from '../lib/store/asignacionesStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import toast from 'react-hot-toast';

export function MisEntregas() {
  const {
    misAsignaciones,
    fetchMisAsignaciones,
    actualizarEstadoAsignacion,
    subscribeToAsignacionesChanges,
    isLoading
  } = useAsignacionesStore();

  const [selectedAsignacion, setSelectedAsignacion] = useState<AsignacionEntrega | null>(null);

  useEffect(() => {
    fetchMisAsignaciones();
    const subscription = subscribeToAsignacionesChanges();

    const interval = setInterval(() => {
      fetchMisAsignaciones();
    }, 30000);

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(interval);
    };
  }, [fetchMisAsignaciones]);

  const handleActualizarEstado = async (
    asignacion: AsignacionEntrega,
    nuevoEstado: AsignacionEntrega['estado']
  ) => {
    try {
      await actualizarEstadoAsignacion(asignacion.id, nuevoEstado);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const abrirEnMaps = (direccion: any) => {
    if (!direccion) return;

    let query = '';
    if (direccion.plus_code) {
      query = encodeURIComponent(direccion.plus_code);
    } else if (direccion.calle) {
      const direccionCompleta = `${direccion.calle}, ${direccion.ciudad || ''}, México`;
      query = encodeURIComponent(direccionCompleta);
    }

    if (query) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const llamarCliente = (telefono: string) => {
    window.location.href = `tel:${telefono}`;
  };

  const getMetodoPagoInfo = (metodoPago?: string) => {
    switch (metodoPago?.toLowerCase()) {
      case 'efectivo':
        return {
          icon: Banknote,
          text: 'Efectivo - Cobrar al entregar',
          color: 'bg-green-100 text-green-800 border-green-300',
          needsCash: true
        };
      case 'tarjeta':
        return {
          icon: CreditCard,
          text: 'Tarjeta - Ya pagado',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          needsCash: false
        };
      case 'transferencia':
        return {
          icon: Smartphone,
          text: 'Transferencia - Ya pagado',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          needsCash: false
        };
      default:
        return {
          icon: DollarSign,
          text: 'No especificado',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          needsCash: false
        };
    }
  };

  const getEstadoBadge = (estado: AsignacionEntrega['estado']) => {
    switch (estado) {
      case 'asignado':
        return { text: 'Asignado', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
      case 'recogido':
        return { text: 'Recogido', color: 'bg-yellow-100 text-yellow-800', icon: Package };
      case 'en_camino':
        return { text: 'En Camino', color: 'bg-blue-100 text-blue-800', icon: Navigation };
      case 'entregado':
        return { text: 'Entregado', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      default:
        return { text: estado, color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  const estadisticas = {
    total: misAsignaciones.length,
    asignadas: misAsignaciones.filter(a => a.estado === 'asignado').length,
    enCamino: misAsignaciones.filter(a => a.estado === 'en_camino').length
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Truck className="w-8 h-8 mr-3 text-blue-600" />
            Mis Entregas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona tus entregas asignadas y actualiza su estado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Pendientes</p>
                <p className="text-xl font-bold text-gray-900">{estadisticas.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Por Recoger</p>
                <p className="text-xl font-bold text-gray-900">{estadisticas.asignadas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Navigation className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">En Camino</p>
                <p className="text-xl font-bold text-gray-900">{estadisticas.enCamino}</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando entregas...</span>
          </div>
        ) : misAsignaciones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12 text-center">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes entregas pendientes</h3>
            <p className="text-gray-500">
              Cuando te asignen entregas, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {misAsignaciones.map((asignacion) => {
              const pedido = asignacion.pedido;
              const estadoBadge = getEstadoBadge(asignacion.estado);
              const EstadoIcon = estadoBadge.icon;
              const metodoPagoInfo = getMetodoPagoInfo(pedido?.metodo_pago);
              const MetodoPagoIcon = metodoPagoInfo.icon;

              return (
                <div
                  key={asignacion.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6"
                >
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Pedido #{pedido?.id}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {pedido?.insert_date && formatDate(pedido.insert_date)}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge.color}`}>
                        <EstadoIcon className="w-3 h-3 mr-1" />
                        {estadoBadge.text}
                      </span>
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${metodoPagoInfo.color}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <MetodoPagoIcon className="w-5 h-5" />
                          <div>
                            <p className="text-sm font-semibold">{metodoPagoInfo.text}</p>
                            {metodoPagoInfo.needsCash && (
                              <p className="text-lg font-bold mt-1">
                                Monto a cobrar: {formatCurrency(pedido?.total || 0)}
                              </p>
                            )}
                          </div>
                        </div>
                        {!metodoPagoInfo.needsCash && (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">Cliente</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {pedido?.cliente_nombre || 'Sin nombre'}
                            </p>
                            {pedido?.cliente_telefono && (
                              <button
                                onClick={() => llamarCliente(pedido.cliente_telefono)}
                                className="flex items-center text-sm text-blue-600 hover:text-blue-700 mt-1"
                              >
                                <Phone className="w-3 h-3 mr-1" />
                                {pedido.cliente_telefono}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {pedido?.direccion_envio && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2 flex-1">
                              <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-blue-700 font-medium">Dirección</p>
                                <p className="text-sm font-semibold text-blue-900">
                                  {pedido.direccion_envio.calle}
                                </p>
                                {pedido.direccion_envio.ciudad && (
                                  <p className="text-xs text-blue-700">
                                    {pedido.direccion_envio.ciudad}
                                  </p>
                                )}
                                {pedido.direccion_envio.referencias && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    <strong>Ref:</strong> {pedido.direccion_envio.referencias}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => abrirEnMaps(pedido.direccion_envio)}
                              className="ml-2 p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                              title="Abrir en Google Maps"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {pedido?.notas_entrega && (
                      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Notas importantes:</strong> {pedido.notas_entrega}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {asignacion.estado === 'asignado' && (
                        <button
                          onClick={() => handleActualizarEstado(asignacion, 'recogido')}
                          className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                        >
                          <Package className="w-4 h-4 mr-2" />
                          Recoger Pedido
                        </button>
                      )}

                      {asignacion.estado === 'recogido' && (
                        <button
                          onClick={() => handleActualizarEstado(asignacion, 'en_camino')}
                          className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Iniciar Entrega
                        </button>
                      )}

                      {asignacion.estado === 'en_camino' && (
                        <button
                          onClick={() => handleActualizarEstado(asignacion, 'entregado')}
                          className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marcar Entregado
                        </button>
                      )}

                      {pedido?.direccion_envio && (
                        <button
                          onClick={() => abrirEnMaps(pedido.direccion_envio)}
                          className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Ver en Mapa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
