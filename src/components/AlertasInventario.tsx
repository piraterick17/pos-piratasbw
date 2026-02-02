import React, { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, Clock, TrendingDown, Package, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface Alerta {
  id: number;
  insumo_id: number;
  insumo_nombre: string;
  tipo_alerta: 'critico' | 'advertencia' | 'normal';
  dias_restantes: number | null;
  cantidad_sugerida_compra: number;
  mensaje: string;
  fecha_alerta: string;
  stock_actual: number;
  unidad_medida: string;
}

export function AlertasInventario() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    try {
      const { data, error } = await supabase
        .from('alertas_inventario')
        .select(`
          id,
          insumo_id,
          tipo_alerta,
          dias_restantes,
          cantidad_sugerida_compra,
          mensaje,
          fecha_alerta,
          insumos!inner (
            nombre,
            stock_actual,
            unidad_medida
          )
        `)
        .eq('resuelta', false)
        .order('tipo_alerta', { ascending: true })
        .order('dias_restantes', { ascending: true });

      if (error) throw error;

      const alertasFormateadas = data?.map((a: any) => ({
        id: a.id,
        insumo_id: a.insumo_id,
        insumo_nombre: a.insumos.nombre,
        tipo_alerta: a.tipo_alerta,
        dias_restantes: a.dias_restantes,
        cantidad_sugerida_compra: a.cantidad_sugerida_compra,
        mensaje: a.mensaje,
        fecha_alerta: a.fecha_alerta,
        stock_actual: a.insumos.stock_actual,
        unidad_medida: a.insumos.unidad_medida,
      })) || [];

      setAlertas(alertasFormateadas);
    } catch (error: any) {
      toast.error('Error al cargar alertas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resolverAlerta = async (alertaId: number) => {
    try {
      const { error } = await supabase
        .from('alertas_inventario')
        .update({
          resuelta: true,
          fecha_resolucion: new Date().toISOString()
        })
        .eq('id', alertaId);

      if (error) throw error;

      toast.success('Alerta marcada como resuelta');
      loadAlertas();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const getAlertaConfig = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-500',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          badgeColor: 'bg-red-600',
        };
      case 'advertencia':
        return {
          icon: AlertCircle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-500',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
          badgeColor: 'bg-orange-600',
        };
      default:
        return {
          icon: TrendingDown,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-500',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          badgeColor: 'bg-yellow-600',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pirateRed"></div>
      </div>
    );
  }

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-green-600" />
        <p className="text-green-800 font-medium">
          No hay alertas de inventario
        </p>
        <p className="text-green-600 text-sm mt-1">
          Todos los insumos tienen stock suficiente
        </p>
      </div>
    );
  }

  const alertasCriticas = alertas.filter(a => a.tipo_alerta === 'critico').length;
  const alertasAdvertencia = alertas.filter(a => a.tipo_alerta === 'advertencia').length;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-white border-2 border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              Alertas de Inventario Inteligente
            </h3>
            <p className="text-xs text-gray-500">
              {alertasCriticas} críticas, {alertasAdvertencia} advertencias, {alertas.length} total
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && alertas.map((alerta) => {
        const config = getAlertaConfig(alerta.tipo_alerta);
        const Icon = config.icon;

        return (
          <div
            key={alerta.id}
            className={`${config.bgColor} ${config.borderColor} border-l-4 rounded-lg p-4 transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${config.badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded uppercase`}>
                      {alerta.tipo_alerta}
                    </span>
                    {alerta.dias_restantes !== null && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{alerta.dias_restantes} días restantes</span>
                      </div>
                    )}
                  </div>

                  <p className={`${config.textColor} font-medium text-sm mb-2`}>
                    {alerta.mensaje}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Stock actual:</span>
                      <span className={`${config.textColor} font-semibold ml-1`}>
                        {alerta.stock_actual.toFixed(2)} {alerta.unidad_medida}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Comprar:</span>
                      <span className={`${config.textColor} font-semibold ml-1`}>
                        {alerta.cantidad_sugerida_compra.toFixed(2)} {alerta.unidad_medida}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => resolverAlerta(alerta.id)}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Marcar como resuelta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
