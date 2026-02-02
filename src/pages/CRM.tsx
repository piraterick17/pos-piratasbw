import React, { useEffect, useState } from 'react';
import { Users, Trophy, TrendingUp, AlertCircle, Gift, Star, Phone, DollarSign, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/utils/formatters';
import { ClienteDetalleModal } from '../components/ClienteDetalleModal';

interface ClienteMetrica {
  cliente_id: string;
  nombre: string;
  telefono: string;
  email: string;
  segmento: string;
  total_pedidos: number;
  total_gastado: number;
  ticket_promedio: number;
  ultima_compra: string;
  dias_sin_comprar: number;
  puntos_actuales: number;
  nivel_lealtad: string;
}

export default function CRM() {
  const [clientes, setClientes] = useState<ClienteMetrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    vip: 0,
    regular: 0,
    nuevo: 0,
    en_riesgo: 0,
    inactivo: 0,
  });

  useEffect(() => {
    loadClientes();
  }, [filtroSegmento]);

  const loadClientes = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('v_metricas_clientes')
        .select('*');

      if (filtroSegmento !== 'todos') {
        query = query.eq('segmento', filtroSegmento);
      }

      const { data, error } = await query
        .order('total_gastado', { ascending: false });

      if (error) throw error;

      setClientes(data || []);

      const statsQuery = await supabase
        .from('clientes_segmentos')
        .select('segmento');

      if (statsQuery.data) {
        const stats = {
          total: statsQuery.data.length,
          vip: statsQuery.data.filter(c => c.segmento === 'vip').length,
          regular: statsQuery.data.filter(c => c.segmento === 'regular').length,
          nuevo: statsQuery.data.filter(c => c.segmento === 'nuevo').length,
          en_riesgo: statsQuery.data.filter(c => c.segmento === 'en_riesgo').length,
          inactivo: statsQuery.data.filter(c => c.segmento === 'inactivo').length,
        };
        setEstadisticas(stats);
      }
    } catch (error: any) {
      toast.error('Error al cargar clientes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSegmentoConfig = (segmento: string) => {
    switch (segmento) {
      case 'vip':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: Trophy,
          label: 'VIP',
        };
      case 'regular':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Star,
          label: 'Regular',
        };
      case 'nuevo':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: Gift,
          label: 'Nuevo',
        };
      case 'en_riesgo':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: AlertCircle,
          label: 'En Riesgo',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Users,
          label: 'Inactivo',
        };
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'platino':
        return 'text-gray-700 font-bold';
      case 'oro':
        return 'text-yellow-600 font-bold';
      case 'plata':
        return 'text-gray-500 font-semibold';
      default:
        return 'text-orange-600';
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
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM y Fidelización</h1>
          <p className="text-gray-600">Gestión de relaciones con clientes y programa de lealtad</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <button
          onClick={() => setFiltroSegmento('todos')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filtroSegmento === 'todos'
              ? 'bg-pirateRed text-white border-pirateRed shadow-lg'
              : 'bg-white border-gray-200 hover:border-pirateRed'
          }`}
        >
          <Users className="w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold">{estadisticas.total}</p>
          <p className="text-xs">Todos</p>
        </button>

        <button
          onClick={() => setFiltroSegmento('vip')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filtroSegmento === 'vip'
              ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
              : 'bg-white border-gray-200 hover:border-purple-600'
          }`}
        >
          <Trophy className="w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold">{estadisticas.vip}</p>
          <p className="text-xs">VIP</p>
        </button>

        <button
          onClick={() => setFiltroSegmento('regular')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filtroSegmento === 'regular'
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
              : 'bg-white border-gray-200 hover:border-blue-600'
          }`}
        >
          <Star className="w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold">{estadisticas.regular}</p>
          <p className="text-xs">Regular</p>
        </button>

        <button
          onClick={() => setFiltroSegmento('nuevo')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filtroSegmento === 'nuevo'
              ? 'bg-green-600 text-white border-green-600 shadow-lg'
              : 'bg-white border-gray-200 hover:border-green-600'
          }`}
        >
          <Gift className="w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold">{estadisticas.nuevo}</p>
          <p className="text-xs">Nuevo</p>
        </button>

        <button
          onClick={() => setFiltroSegmento('en_riesgo')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filtroSegmento === 'en_riesgo'
              ? 'bg-orange-600 text-white border-orange-600 shadow-lg'
              : 'bg-white border-gray-200 hover:border-orange-600'
          }`}
        >
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold">{estadisticas.en_riesgo}</p>
          <p className="text-xs">En Riesgo</p>
        </button>

        <button
          onClick={() => setFiltroSegmento('inactivo')}
          className={`p-4 rounded-lg border-2 transition-all ${
            filtroSegmento === 'inactivo'
              ? 'bg-gray-600 text-white border-gray-600 shadow-lg'
              : 'bg-white border-gray-200 hover:border-gray-600'
          }`}
        >
          <TrendingUp className="w-6 h-6 mx-auto mb-2" />
          <p className="text-2xl font-bold">{estadisticas.inactivo}</p>
          <p className="text-xs">Inactivo</p>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segmento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Gastado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Promedio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Compra
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Puntos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientes.map((cliente) => {
                const config = getSegmentoConfig(cliente.segmento);
                const SegmentoIcon = config.icon;

                return (
                  <tr key={cliente.cliente_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {cliente.nombre}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {cliente.telefono}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                        <SegmentoIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cliente.total_pedidos || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(cliente.total_gastado || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(cliente.ticket_promedio || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cliente.ultima_compra
                        ? new Date(cliente.ultima_compra).toLocaleDateString('es-MX')
                        : 'N/A'}
                      {cliente.dias_sin_comprar > 0 && (
                        <div className="text-xs text-gray-400">
                          Hace {cliente.dias_sin_comprar} días
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                        <Gift className="w-4 h-4 text-pirateRed" />
                        {cliente.puntos_actuales || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm uppercase ${getNivelColor(cliente.nivel_lealtad || 'bronce')}`}>
                        {cliente.nivel_lealtad || 'Bronce'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedClienteId(cliente.cliente_id);
                          setIsModalOpen(true);
                        }}
                        className="text-pirateRed hover:text-pirateRedDark flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {clientes.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay clientes en este segmento</p>
          </div>
        )}
      </div>

      </div>
      </div>

      {selectedClienteId && (
        <ClienteDetalleModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedClienteId(null);
          }}
          clienteId={selectedClienteId}
        />
      )}
    </div>
  );
}
