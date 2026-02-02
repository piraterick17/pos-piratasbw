import React, { useEffect, useState } from 'react';
import { Trophy, Gift, TrendingUp, Calendar, DollarSign, Award, Star } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { formatCurrency } from '../lib/utils/formatters';

interface MetricasCliente {
  cliente_id: string;
  segmento: string;
  total_pedidos: number;
  total_gastado: number;
  ticket_promedio: number;
  ultima_compra: string;
  dias_sin_comprar: number;
  frecuencia_compra_dias: number;
  puntos_actuales: number;
  nivel_lealtad: string;
  puntos_acumulados_historico: number;
}

interface Props {
  clienteId: string;
}

export function MetricasCliente({ clienteId }: Props) {
  const [metricas, setMetricas] = useState<MetricasCliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetricas();
  }, [clienteId]);

  const loadMetricas = async () => {
    try {
      const { data, error } = await supabase
        .from('v_metricas_clientes')
        .select('*')
        .eq('cliente_id', clienteId)
        .maybeSingle();

      if (error) throw error;
      setMetricas(data);
    } catch (error) {
      console.error('Error al cargar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pirateRed"></div>
      </div>
    );
  }

  if (!metricas) {
    return null;
  }

  const getSegmentoConfig = (segmento: string) => {
    switch (segmento) {
      case 'vip':
        return {
          color: 'text-purple-700',
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-500',
          label: 'VIP',
          icon: Trophy,
        };
      case 'regular':
        return {
          color: 'text-blue-700',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-500',
          label: 'Regular',
          icon: Star,
        };
      case 'nuevo':
        return {
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-500',
          label: 'Nuevo',
          icon: Gift,
        };
      case 'en_riesgo':
        return {
          color: 'text-orange-700',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-500',
          label: 'En Riesgo',
          icon: TrendingUp,
        };
      default:
        return {
          color: 'text-gray-700',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-500',
          label: 'Inactivo',
          icon: Calendar,
        };
    }
  };

  const getNivelConfig = (nivel: string) => {
    switch (nivel) {
      case 'platino':
        return { color: 'text-gray-800', bgColor: 'bg-gradient-to-r from-gray-300 to-gray-400' };
      case 'oro':
        return { color: 'text-yellow-800', bgColor: 'bg-gradient-to-r from-yellow-300 to-yellow-500' };
      case 'plata':
        return { color: 'text-gray-600', bgColor: 'bg-gradient-to-r from-gray-200 to-gray-300' };
      default:
        return { color: 'text-orange-800', bgColor: 'bg-gradient-to-r from-orange-300 to-orange-400' };
    }
  };

  const segmentoConfig = getSegmentoConfig(metricas.segmento);
  const SegmentoIcon = segmentoConfig.icon;
  const nivelConfig = getNivelConfig(metricas.nivel_lealtad);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${segmentoConfig.bgColor} ${segmentoConfig.borderColor} border-l-4 rounded-lg p-4`}>
          <div className="flex items-center gap-3">
            <SegmentoIcon className={`w-8 h-8 ${segmentoConfig.color}`} />
            <div>
              <p className="text-xs text-gray-600">Segmento</p>
              <p className={`text-lg font-bold ${segmentoConfig.color} uppercase`}>
                {segmentoConfig.label}
              </p>
            </div>
          </div>
        </div>

        <div className={`${nivelConfig.bgColor} rounded-lg p-4`}>
          <div className="flex items-center gap-3">
            <Award className={`w-8 h-8 ${nivelConfig.color}`} />
            <div>
              <p className="text-xs text-gray-700">Nivel de Lealtad</p>
              <p className={`text-lg font-bold ${nivelConfig.color} uppercase`}>
                {metricas.nivel_lealtad || 'Bronce'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-pirateRed" />
          <h3 className="font-semibold text-gray-900">Puntos de Lealtad</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-pirateRed">
              {metricas.puntos_actuales || 0}
            </p>
            <p className="text-xs text-gray-500">Puntos Disponibles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-700">
              {metricas.puntos_acumulados_historico || 0}
            </p>
            <p className="text-xs text-gray-500">Total Acumulados</p>
          </div>
        </div>
        <div className="mt-3 bg-green-50 rounded p-2 text-xs text-green-700">
          100 puntos = $10.00 de descuento
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Total Pedidos</p>
          <p className="text-xl font-bold text-gray-900">
            {metricas.total_pedidos || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Total Gastado</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(metricas.total_gastado || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Ticket Promedio</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(metricas.ticket_promedio || 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">Días sin Comprar</p>
          <p className={`text-xl font-bold ${
            metricas.dias_sin_comprar > 30 ? 'text-orange-600' : 'text-gray-900'
          }`}>
            {metricas.dias_sin_comprar || 0}
          </p>
        </div>
      </div>

      {metricas.ultima_compra && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="text-gray-600">Última compra: </span>
          <span className="font-medium text-gray-900">
            {new Date(metricas.ultima_compra).toLocaleDateString('es-MX')}
          </span>
        </div>
      )}
    </div>
  );
}
