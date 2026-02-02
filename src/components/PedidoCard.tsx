import React, { useEffect, useState, memo } from 'react';
import { Pedido, usePedidosStore } from '../lib/store/pedidosStore';
import { formatCurrency, getTimeElapsed } from '../lib/utils/formatters';
import { User, DollarSign, Clock, Package, Home, ShoppingBag, ArrowRight, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase/client';

interface ProgresoPedido {
  total_items: number;
  items_listos: number;
  porcentaje_completado: number;
}

interface PedidoCardProps {
  pedido: Pedido;
}

export const PedidoCard = memo(function PedidoCard({ pedido }: PedidoCardProps) {
  const { getValidTransitions, updatePedidoStatus } = usePedidosStore();
  const [nextState, setNextState] = useState<any>(null);
  const [isLoadingNextState, setIsLoadingNextState] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoPedido | null>(null);

  useEffect(() => {
    if (pedido.estado_id) {
      setIsLoadingNextState(true);
      getValidTransitions(pedido.estado_id).then(transitions => {
        // Tomamos la transición principal (excluyendo "Cancelar")
        const primaryTransition = transitions.find(t => t.nombre !== 'Cancelado');
        setNextState(primaryTransition || null);
        setIsLoadingNextState(false);
      });
    }
  }, [pedido.estado_id, getValidTransitions]);

  // Cargar progreso del pedido
  useEffect(() => {
    const loadProgreso = async () => {
      try {
        const { data, error } = await supabase
          .rpc('obtener_progreso_pedido', { p_pedido_id: pedido.id });

        if (error) throw error;

        if (data && data.length > 0) {
          setProgreso(data[0]);
        }
      } catch (error) {
        console.error('Error loading progreso:', error);
      }
    };

    if (pedido.id) {
      loadProgreso();

      // Suscribirse a cambios en cocina_items
      const channel = supabase
        .channel(`progreso-card-${pedido.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cocina_items',
            filter: `pedido_id=eq.${pedido.id}`
          },
          () => {
            loadProgreso();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [pedido.id]);

  const handleMoveToNextState = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el clic active otros eventos
    if (nextState) {
      updatePedidoStatus(pedido.id!, nextState.id);
    }
  };

  const navigateToDetalle = () => {
    window.location.hash = `#pedidos/${pedido.id}`;
    window.location.reload();
  };

  const getTipoEntregaIcon = () => {
    switch (pedido.tipo_entrega_nombre) {
      case 'A domicilio': return <Home className="w-3 h-3" />;
      case 'Para llevar': return <ShoppingBag className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 hover:border-blue-500 transition-all group">
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-gray-800">Pedido #{pedido.id}</h4>
        <button onClick={navigateToDetalle} title="Ver detalle" className="p-1 text-gray-400 hover:text-blue-600">
          <Eye className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mt-2 text-sm">
        <div className="flex items-center text-gray-700">
          <User className="w-4 h-4 mr-2 text-gray-400" />
          <span className="truncate">{pedido.cliente_nombre || 'Público General'}</span>
        </div>
        <div className="flex items-center text-gray-700">
          <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
          <span className="font-semibold">{formatCurrency(pedido.total || 0)}</span>
        </div>
        <div className="flex items-center text-gray-500 text-xs">
          <Clock className="w-3 h-3 mr-2" />
          <span>{getTimeElapsed(pedido.insert_date || '')}</span>
          <span className="mx-1">•</span>
          {getTipoEntregaIcon()}
          <span className="ml-1">{pedido.tipo_entrega_nombre}</span>
        </div>
      </div>

      {/* Indicador de progreso de cocina */}
      {progreso && progreso.total_items > 0 && (
        <div className="mt-3 p-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-900 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Cocina
            </span>
            <span className="text-xs font-bold text-blue-900">
              {progreso.items_listos}/{progreso.total_items}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                progreso.porcentaje_completado === 100
                  ? 'bg-green-600'
                  : progreso.porcentaje_completado >= 70
                  ? 'bg-blue-600'
                  : progreso.porcentaje_completado >= 40
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${progreso.porcentaje_completado}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-700 text-center font-medium">
            {progreso.porcentaje_completado}% listo
          </div>
        </div>
      )}

      {nextState && (
        <button 
          onClick={handleMoveToNextState}
          className="w-full mt-3 py-2 px-3 bg-blue-500 text-white rounded-md flex items-center justify-center text-sm font-semibold hover:bg-blue-600 transition-colors opacity-0 group-hover:opacity-100"
        >
          {isLoadingNextState ? 'Cargando...' : `Mover a "${nextState.nombre}"`}
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      )}
    </div>
  );
});