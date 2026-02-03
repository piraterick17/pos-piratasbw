import { useState, useMemo } from 'react';
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
import { ModoFiltroCategorias } from '../lib/utils/orderFilters';
import { useDashboardData } from '../hooks/useDashboardData';
import { getDateRangeMexico } from '../lib/utils/time';

export function Transacciones() {
  const { isLoading: isLoadingStore } = usePedidosStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<ModoFiltroCategorias>('todos');

  // Filtros de fecha robustos usando la utilidad centralizada
  const [dateRange, setDateRange] = useState(() => {
    const [start, end] = getDateRangeMexico('today');
    return { start, end, type: 'hoy' as 'hoy' | 'semana' | 'mes' | 'custom' };
  });

  const handleRangeChange = (type: 'hoy' | 'semana' | 'mes') => {
    const apiTypeMap = { hoy: 'today', semana: 'week', mes: 'month' } as const;
    const [start, end] = getDateRangeMexico(apiTypeMap[type]);
    setDateRange({ start, end, type });
  };

  // Datos analíticos centralizados
  const { data: analytics, loading: isLoadingAnalytics } = useDashboardData(
    dateRange.start,
    dateRange.end,
    {
      filterCategoria: filtroCategoria,
      desayunosCategoryId: 54,
      includeCancelled: true
    }
  );

  // Cálculo de Métricas y Filtrado por búsqueda
  const { filteredPedidos, metrics } = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    const filtered = analytics.rawData.filter((p: any) => {
      const matchesSearch =
        p.cliente_nombre?.toLowerCase().includes(searchLower) ||
        p.id?.toString().includes(searchTerm);
      return matchesSearch;
    });

    const porMetodo: Record<string, { cantidad: number; monto: number }> = {};

    filtered.forEach((p: any) => {
      if (['Completado', 'En Reparto'].includes(p.estado_nombre || '')) {
        const metodo = p.metodo_pago || 'Otro';
        if (!porMetodo[metodo]) porMetodo[metodo] = { cantidad: 0, monto: 0 };
        porMetodo[metodo].cantidad++;
        porMetodo[metodo].monto += (p.total || 0);
      }
    });

    return {
      filteredPedidos: filtered,
      metrics: {
        totalVentas: analytics.totalVentas,
        totalPedidos: analytics.totalPedidos,
        porMetodo,
        ticketPromedio: analytics.ticketPromedio
      }
    };
  }, [analytics, searchTerm]);

  const getMethodIcon = (method: string) => {
    const m = (method || '').toLowerCase();
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
            <p className="text-xs md:text-sm text-gray-500 hidden md:block">Historial financiero unificado</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            {(['hoy', 'semana', 'mes', 'custom'] as const).map((type) => (
              <button
                key={type}
                onClick={() => type !== 'custom' ? handleRangeChange(type as any) : setDateRange(prev => ({ ...prev, type: 'custom' }))}
                className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md whitespace-nowrap transition-all ${dateRange.type === type
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
              <div className="flex items-center gap-2 px-2 text-xs text-gray-500">
                <span>Del: {new Date(dateRange.start).toLocaleDateString()}</span>
                <span>-</span>
                <span>Al: {new Date(dateRange.end).toLocaleDateString()}</span>
              </div>
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
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${filtroCategoria === 'todos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Todos los Pedidos
            </button>
            <button
              onClick={() => setFiltroCategoria('solo_desayunos')}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${filtroCategoria === 'solo_desayunos'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Solo Desayunos
            </button>
            <button
              onClick={() => setFiltroCategoria('excluir_desayunos')}
              className={`flex-1 md:flex-none px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${filtroCategoria === 'excluir_desayunos'
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

          {Object.entries(metrics.porMetodo).map(([metodo, datos]: [string, any]) => (
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
              <span className="text-xs">Sin movimientos en este rango</span>
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
              {isLoadingAnalytics || isLoadingStore ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Cargando...</td></tr>
              ) : filteredPedidos.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">No se encontraron transacciones.</td></tr>
              ) : (
                filteredPedidos.map((pedido: any) => {
                  let metodoTexto = pedido.metodo_pago;
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
                  )
                })
              )}
            </tbody>
          </table>

          {/* Lista Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {isLoadingAnalytics || isLoadingStore ? (
              <div className="p-8 text-center text-gray-500 text-sm">Cargando...</div>
            ) : filteredPedidos.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No se encontraron movimientos.</div>
            ) : (
              filteredPedidos.map((pedido: any) => {
                let metodoTexto = pedido.metodo_pago;
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
          pedido={filteredPedidos.find((p: any) => p.id === selectedPedidoId)}
        />
      )}
    </div>
  );
}