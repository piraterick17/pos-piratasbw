import React, { useEffect, useState } from 'react';
import {
  Bike,
  Plus,
  Edit,
  Trash2,
  Phone,
  Car,
  TrendingUp,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/utils/formatters';

interface Repartidor {
  id: number;
  nombre: string;
  telefono: string;
  vehiculo_tipo: string;
  placa_vehiculo: string | null;
  estado: string;
  activo: boolean;
}

interface MetricasRepartidor {
  id: number;
  nombre: string;
  telefono: string;
  vehiculo_tipo: string;
  estado: string;
  activo: boolean;
  total_entregas: number;
  entregas_completadas: number;
  entregas_canceladas: number;
  tiempo_promedio_entrega: number;
  calificacion_promedio: number;
  entregas_hoy: number;
  entregas_semana: number;
  distancia_total_km: number;
}

export default function Repartidores() {
  const [repartidores, setRepartidores] = useState<MetricasRepartidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Repartidor | null>(null);

  useEffect(() => {
    loadRepartidores();
  }, []);

  const loadRepartidores = async () => {
    try {
      const { data, error } = await supabase
        .from('v_desempeno_repartidores')
        .select('*')
        .order('entregas_completadas', { ascending: false });

      if (error) throw error;
      setRepartidores(data || []);
    } catch (error: any) {
      toast.error('Error al cargar repartidores: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const repartidorData = {
        nombre: formData.get('nombre') as string,
        telefono: formData.get('telefono') as string,
        vehiculo_tipo: formData.get('vehiculo_tipo') as string,
        placa_vehiculo: formData.get('placa_vehiculo') as string || null,
        estado: formData.get('estado') as string,
        activo: formData.get('activo') === 'true',
      };

      if (editando) {
        const { error } = await supabase
          .from('repartidores')
          .update(repartidorData)
          .eq('id', editando.id);

        if (error) throw error;
        toast.success('Repartidor actualizado');
      } else {
        const { error } = await supabase
          .from('repartidores')
          .insert([repartidorData]);

        if (error) throw error;
        toast.success('Repartidor creado');
      }

      setShowModal(false);
      setEditando(null);
      loadRepartidores();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este repartidor?')) return;

    try {
      const { error } = await supabase
        .from('repartidores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Repartidor eliminado');
      loadRepartidores();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const getVehiculoIcon = (tipo: string) => {
    switch (tipo) {
      case 'auto':
        return Car;
      case 'moto':
        return Bike;
      default:
        return Bike;
    }
  };

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return { color: 'bg-green-100 text-green-800', label: 'Disponible' };
      case 'en_ruta':
        return { color: 'bg-blue-100 text-blue-800', label: 'En Ruta' };
      case 'no_disponible':
        return { color: 'bg-gray-100 text-gray-800', label: 'No Disponible' };
      default:
        return { color: 'bg-red-100 text-red-800', label: 'Inactivo' };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pirateRed"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Repartidores</h1>
        <button
          onClick={() => {
            setEditando(null);
            setShowModal(true);
          }}
          className="bg-pirateRed text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-pirateRed/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Repartidor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repartidores.map((repartidor) => {
          const VehiculoIcon = getVehiculoIcon(repartidor.vehiculo_tipo);
          const estadoConfig = getEstadoConfig(repartidor.estado);

          return (
            <div
              key={repartidor.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-pirateRed/10 rounded-full">
                      <VehiculoIcon className="w-6 h-6 text-pirateRed" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {repartidor.nombre}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="w-3 h-3" />
                        {repartidor.telefono}
                      </div>
                    </div>
                  </div>

                  {repartidor.activo ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>

                <div className="mb-4">
                  <span className={`${estadoConfig.color} px-3 py-1 rounded-full text-xs font-medium`}>
                    {estadoConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-900">
                      {repartidor.entregas_completadas || 0}
                    </p>
                    <p className="text-xs text-gray-600">Entregas Totales</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <p className="text-2xl font-bold text-gray-900">
                        {repartidor.calificacion_promedio?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600">Calificación</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Hoy:</span>
                    <span className="font-semibold">{repartidor.entregas_hoy || 0} entregas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Esta semana:</span>
                    <span className="font-semibold">{repartidor.entregas_semana || 0} entregas</span>
                  </div>
                  {repartidor.tiempo_promedio_entrega && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tiempo promedio:</span>
                      <span className="font-semibold">{Math.round(repartidor.tiempo_promedio_entrega)} min</span>
                    </div>
                  )}
                  {repartidor.distancia_total_km > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Distancia total:</span>
                      <span className="font-semibold">{repartidor.distancia_total_km.toFixed(1)} km</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditando({
                        id: repartidor.id,
                        nombre: repartidor.nombre,
                        telefono: repartidor.telefono,
                        vehiculo_tipo: repartidor.vehiculo_tipo,
                        placa_vehiculo: null,
                        estado: repartidor.estado,
                        activo: repartidor.activo,
                      });
                      setShowModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(repartidor.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editando ? 'Editar Repartidor' : 'Nuevo Repartidor'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={editando?.nombre}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="telefono"
                  defaultValue={editando?.telefono}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Vehículo
                </label>
                <select
                  name="vehiculo_tipo"
                  defaultValue={editando?.vehiculo_tipo || 'moto'}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
                >
                  <option value="bicicleta">Bicicleta</option>
                  <option value="moto">Moto</option>
                  <option value="auto">Auto</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa del Vehículo (opcional)
                </label>
                <input
                  type="text"
                  name="placa_vehiculo"
                  defaultValue={editando?.placa_vehiculo || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="estado"
                  defaultValue={editando?.estado || 'disponible'}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
                >
                  <option value="disponible">Disponible</option>
                  <option value="en_ruta">En Ruta</option>
                  <option value="no_disponible">No Disponible</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activo
                </label>
                <select
                  name="activo"
                  defaultValue={editando?.activo ? 'true' : 'false'}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pirateRed focus:border-transparent"
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditando(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pirateRed text-white px-4 py-2 rounded-lg hover:bg-pirateRed/90 transition-colors"
                >
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
