import React, { useEffect, useState, useMemo } from 'react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import {
  Search,
  ArrowUpRight,
  CreditCard,
  Wallet,
  Eye,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { PedidoDetalleModal } from '../components/PedidoDetalleModal';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import { calculateVentasTotales } from '../lib/utils/ventasCalculations';
import { filterPedidosByCategoria, ModoFiltroCategorias } from '../lib/utils/orderFilters';

export function Transacciones() {
  const { 
    pedidos, 
    isLoading, 
    fetchPedidosByDateRange 
  } = usePedidosStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<ModoFiltroCategorias>('todos');

  // Filtros de fecha
  const [dateFilterType, setDateFilterType] = useState<'hoy' | 'semana' | 'mes' | 'custom'>('hoy');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Función auxiliar para obtener la fecha local YYYY-MM-DD del navegador
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Inicializar fechas al cargar
  useEffect(() => {
    const todayStr = getLocalDateStr(new Date());
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      const now = new Date();
      const todayStr = getLocalDateStr(now);

      let startStr = startDate || todayStr;
      let endStr = endDate || todayStr;
      
      // Lógica de botones rápidos
      if (dateFilterType === 'hoy') {
        startStr = todayStr;
        endStr = todayStr;
      } else if (dateFilterType === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        startStr = getLocalDateStr(weekAgo);
        endStr = todayStr;
      } else if (dateFilterType === 'mes') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        startStr = getLocalDateStr(monthAgo);
        endStr = todayStr;
      } else if (dateFilterType === 'custom') {
         startStr = startDate;
         endStr = endDate;
      }

      // Sincronizar inputs visuales
      if (dateFilterType !== 'custom') {
        setStartDate(startStr);
        setEndDate(endStr);
      }

      // === CORRECCIÓN DE ZONA HORARIA (AQUÍ ESTÁ LA SOLUCIÓN) ===
      
      // 1. Creamos objetos Date basados en la hora LOCAL del navegador.
      // Al pasar "T00:00:00", el navegador asume medianoche local (ej: México).
      const localStart = new Date(`${startStr}T00:00:00`);
      const localEnd = new Date(`${endStr}T23:59:59.999`);

      // 2. Convertimos a ISO String (UTC) para la base de datos.
      // Si son las 00:00 México, .toISOString() generará 06:00 UTC automáticamente.
      const startISO = localStart.toISOString();
      const endISO = localEnd.toISOString();
      
      console.log('Filtro Local:', startStr, 'a', endStr);
      console.log('Filtro UTC enviado a BD:', startISO, 'a', endISO);
      
      await fetchPedidosByDateRange(startISO, endISO);
    };
    
    loadData();
  }, [dateFilterType, startDate, endDate, fetchPedidosByDateRange]);

  // Cálculo de Métricas (usando función centralizada)
  const { filteredPedidos, metrics } = useMemo(() => {
    const pedidosFiltradosPorCategoria = filterPedidosByCategoria(pedidos, filtroCategoria, 54);

    const filtered = pedidosFiltradosPorCategoria.filter(p => {
      const matchesSearch =
        p.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toString().includes(searchTerm);

      const isValidStatus = ['Completado', 'En Reparto', 'Cancelado'].includes(p.estado_nombre || '');
      return matchesSearch && isValidStatus;
    });

    // Usar función centralizada para cálculos (solo Completado + En Reparto)
    const resultado = calculateVentasTotales(filtered, {
      estados: ['Completado', 'En Reparto']
    });

    const porMetodo = resultado.desglosePorMetodoPago.reduce((acc, item) => {
      acc[item.metodo] = { cantidad: item.cantidad, monto: item.monto };
      return acc;
    }, {} as Record<string, { cantidad: number; monto: number }>);

    const ticketPromedio = resultado.totalPedidos > 0
      ? resultado.totalVentas / resultado.totalPedidos
      : 0;

    return {
      filteredPedidos: filtered,
      metrics: {
        totalVentas: resultado.totalVentas,
        totalPedidos: resultado.totalPedidos,
        porMetodo,
        ticketPromedio
      }
    };
  }, [pedidos, searchTerm, filtroCategoria]);

  const getMethodIcon = (method: string) => {
    const m = method.toLowerCase();
    if (m.includes('efectivo')) return <Wallet className="w-5 h-5 text-green-600" />;
    if (m.includes('tarjeta')) return <CreditCard className="w-5 h-5 text-blue-600" />;
    if (m.includes('transferencia')) return <ArrowUpRight className="w-5 h-5 text-purple-600" />;
    return <DollarSign className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* --- HEADER --- */}
      <div className="bg-white border-b px-4 py-3 md:px-6 md:py-4 space-y-3 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Transacciones</h1>
            <p className="text-xs md:text-sm text-gray-500 hidden md:block">Historial financiero</p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            {(['hoy', 'semana', 'mes', 'custom'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDateFilterType(type)}
                className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                  dateFilterType === type 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type === 'custom' ? 'Rango' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3 items-end md:items-center justify-between">
            <div className="flex gap-2 w-full md:w-auto bg-gray-50 p-1 rounded-lg border border-gray-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateFilterType('custom');
                }}
                className="bg-transparent border-none text-xs md:text-sm focus:ring-0 text-gray-600 w-full"
              />
              <span className="text-gray-400 text-xs self-center">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateFilterType('custom');
                }}
                className="bg-transparent border-none text-xs md:text-sm focus:ring-0 text-gray-600 w-full"
              />
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full md:w-auto">
            <button
              onClick={() => setFiltroCategoria('todos')}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'todos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos los Pedidos
            </button>
            <button
              onClick={() => setFiltroCategoria('solo_desayunos')}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'solo_desayunos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Solo Desayunos
            </button>
            <button
              onClick={() => setFiltroCategoria('excluir_desayunos')}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                filtroCategoria === 'excluir_desayunos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sin Desayunos (Turno Regular)
            </button>
          </div>
        </div>
      </div>

      {/* --- MÉTRICAS --- */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
        <div className="flex flex-nowrap md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 min-w-min md:min-w-0">
          
          <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden min-w-[200px] md:min-w-0 flex-shrink-0">
            <div className="absolute right-0 top-0 p-2 opacity-10">
              <TrendingUp className="w-12 h-12 text-indigo-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase">Total Ventas</p>
            <h3 className="text-lg md:text-xl font-bold text-indigo-600 mt-1">
              {formatCurrency(metrics.totalVentas)}
            </h3>
            <p className="text-[10px] md:text-xs text-indigo-400 mt-1 font-medium">
              Ticket Promedio: {formatCurrency(metrics.ticketPromedio)}
            </p>
          </div>

          {Object.entries(metrics.porMetodo).map(([metodo, datos]) => (
            <div key={metodo} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm min-w-[180px] md:min-w-0 flex-shrink-0">
              <div className="flex justify-between items-start mb-1">
                <div className="p-1.5 bg-gray-50 rounded-lg">
                  {getMethodIcon(metodo)}
                </div>
                <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 uppercase">
                  {metodo.substring(0, 10)}
                </span>
              </div>
              <div className="mt-1">
                <h3 className="text-base font-bold text-gray-800">{formatCurrency(datos.monto)}</h3>
                <p className="text-[10px] text-gray-500">
                  {datos.cantidad} transacciones
                </p>
              </div>
            </div>
          ))}
          
          {Object.keys(metrics.porMetodo).length === 0 && (
             <div className="bg-white p-3 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 min-w-[200px]">
               <span className="text-xs">Sin movimientos</span>
             </div>
          )}
        </div>
      </div>

      {/* --- LISTADO --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          
          {/* Tabla Desktop */}
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cliente / Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Método Pago</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Cargando...</td></tr>
              ) : filteredPedidos.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">No se encontraron transacciones.</td></tr>
              ) : (
                filteredPedidos.map((pedido) => {
                  let metodoTexto = pedido.metodo_pago;
                  if (!metodoTexto && pedido.pagos && pedido.pagos.length > 0) {
                     metodoTexto = pedido.pagos[0].metodo_pago;
                  }
                  return (
                  <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">
                          {pedido.cliente_nombre || 'Cliente Final'}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded">#{pedido.id}</span>
                          <span className="text-xs text-gray-400">
                            • {pedido.insert_date ? formatDate(pedido.insert_date) : '-'}
                          </span>
                          {pedido.estado_nombre === 'Cancelado' && (
                             <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded font-bold">CANCELADO</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         {getMethodIcon(metodoTexto || '')}
                         <span className="text-sm text-gray-700 capitalize">
                           {metodoTexto ? metodoTexto.replace('_', ' ') : 'Múltiple / Otros'}
                         </span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-base font-bold ${pedido.estado_nombre === 'Cancelado' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {formatCurrency(pedido.total || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPedidoId(pedido.id!)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>

          {/* Lista Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {isLoading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Cargando...</div>
              ) : filteredPedidos.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No se encontraron movimientos.</div>
              ) : (
                filteredPedidos.map((pedido) => {
                  let metodoTexto = pedido.metodo_pago;
                  if (!metodoTexto && pedido.pagos && pedido.pagos.length > 0) {
                     metodoTexto = pedido.pagos[0].metodo_pago;
                  }
                  return (
                    <div key={pedido.id} className="p-4 active:bg-gray-50" onClick={() => setSelectedPedidoId(pedido.id!)}>
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                            <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                              {getMethodIcon(metodoTexto || '')}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                 {pedido.cliente_nombre || 'Cliente Final'}
                               </p>
                               <p className="text-xs text-gray-500">
                                 {pedido.insert_date ? formatDate(pedido.insert_date) : '-'}
                               </p>
                            </div>
                         </div>
                         <span className={`text-sm font-bold ${pedido.estado_nombre === 'Cancelado' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                           {formatCurrency(pedido.total || 0)}
                         </span>
                      </div>
                      <div className="flex justify-between items-center pl-11">
                         <div className="flex gap-2">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{pedido.id}</span>
                            {pedido.estado_nombre === 'Cancelado' && (
                               <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">CANCELADO</span>
                            )}
                         </div>
                         <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                           Ver detalle <Eye className="w-3 h-3" />
                         </span>
                      </div>
                    </div>
                  );
                })
              )
            }
          </div>
        </div>
      </div>

      {selectedPedidoId && (
        <PedidoDetalleModal
          isOpen={!!selectedPedidoId}
          onClose={() => setSelectedPedidoId(null)}
          pedido={filteredPedidos.find(p => p.id === selectedPedidoId)}
        />
      )}
    </div>
  );
}