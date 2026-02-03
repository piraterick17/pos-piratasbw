import { useState } from 'react';
import {
  BarChart,
  Calendar,
  TrendingUp,
  Package,
  Users,
  FileText,
  Download,
  Search,
} from 'lucide-react';
import { formatCurrency, formatDateTimeMX } from '../lib/utils/format';
import { getDateRangeMexico } from '../lib/utils/time';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

type TipoReporte = 'ventas' | 'productos' | 'clientes' | null;

export function Reportes() {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>(null);

  // Rango de fechas centralizado
  const [dateRange, setDateRange] = useState(() => {
    const [start, end] = getDateRangeMexico('month'); // Mes por defecto para reportes
    return { start, end };
  });

  // El hook se encarga de todo el procesamiento pesado
  const { data: analytics, loading: generandoReporte } = useDashboardData(
    dateRange.start,
    dateRange.end,
    { includeCancelled: false }
  );

  const tiposReporte = [
    {
      id: 'ventas' as TipoReporte,
      titulo: 'Ventas',
      descripcion: 'Análisis de ventas por período',
      icono: TrendingUp,
      colorIcon: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'productos' as TipoReporte,
      titulo: 'Productos',
      descripcion: 'Rendimiento de productos',
      icono: Package,
      colorIcon: 'bg-green-100 text-green-600'
    },
    {
      id: 'clientes' as TipoReporte,
      titulo: 'Clientes',
      descripcion: 'Análisis de clientes',
      icono: Users,
      colorIcon: 'bg-purple-100 text-purple-600'
    }
  ];

  const exportarReporte = () => {
    if (!analytics.rawData.length) return;

    const headers: string[] = [];
    const rows: string[][] = [];

    switch (tipoReporte) {
      case 'ventas':
        headers.push('Fecha', 'Ventas', 'Pedidos');
        analytics.ventasPorDia.forEach(d => rows.push([d.fecha, d.ventas.toString(), d.pedidos.toString()]));
        break;
      case 'productos':
        headers.push('Producto', 'Categoría', 'Cantidad', 'Total');
        analytics.topProductos.forEach(p => rows.push([p.nombre, p.categoria || '', p.cantidad.toString(), p.total.toString()]));
        break;
      case 'clientes':
        headers.push('Cliente', 'Pedidos', 'Total', 'Última Compra');
        analytics.topClientes.forEach(c => rows.push([c.nombre, c.pedidos.toString(), c.total.toString(), c.ultimaCompra || '']));
        break;
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-${tipoReporte}-${new Date().toLocaleDateString()}.csv`);
    link.click();
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart className="w-8 h-8 mr-3 text-indigo-600" />
            Reportes Avanzados
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visualización y exportación de datos financieros con precisión de zona horaria.
          </p>
        </div>

        {/* Filtros de Fecha */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center uppercase tracking-wider">
            <Calendar className="w-4 h-4 mr-2" />
            Rango del Reporte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">FECHA INICIO</label>
              <input
                type="date"
                value={dateRange.start.split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: `${e.target.value}T00:00:00.000Z` }))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">FECHA FIN</label>
              <input
                type="date"
                value={dateRange.end.split('T')[0]}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: `${e.target.value}T23:59:59.999Z` }))}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tipos de Reporte */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiposReporte.map((tipo) => {
            const IconComponent = tipo.icono;
            const isSelected = tipoReporte === tipo.id;

            return (
              <button
                key={tipo.id}
                onClick={() => setTipoReporte(tipo.id)}
                className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-center ${isSelected
                    ? 'border-indigo-600 bg-white shadow-md'
                    : 'border-transparent bg-white hover:border-gray-200 opacity-70 grayscale-[0.5]'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tipo.colorIcon}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{tipo.titulo}</h3>
                  <p className="text-xs text-gray-500 mt-1">{tipo.descripcion}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Área de Resultados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              {tipoReporte ? `Análisis de ${tipoReporte.charAt(0).toUpperCase() + tipoReporte.slice(1)}` : 'Seleccione un Reporte'}
            </h2>

            {tipoReporte && analytics.rawData.length > 0 && (
              <button
                onClick={exportarReporte}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </button>
            )}
          </div>

          {!tipoReporte ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Elija un módulo de análisis</h3>
              <p className="text-gray-500 max-w-xs mx-auto mt-2">
                Haga clic en Ventas, Productos o Clientes arriba para visualizar los datos.
              </p>
            </div>
          ) : generandoReporte ? (
            <div className="text-center py-20 flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="text-gray-500 font-medium font-mono animate-pulse">PROCESANDO DATOS EN TIEMPO REAL...</p>
            </div>
          ) : analytics.rawData.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">Sin datos para este rango</h3>
              <p className="text-gray-500">Intente seleccionando otro período de fechas.</p>
            </div>
          ) : (
            <ReporteResultados type={tipoReporte} data={analytics} />
          )}
        </div>
      </div>
    </div>
  );
}

function ReporteResultados({ type, data }: { type: TipoReporte; data: any }) {
  switch (type) {
    case 'ventas':
      return <ReporteVentas analytics={data} />;
    case 'productos':
      return <ReporteProductos analytics={data} />;
    case 'clientes':
      return <ReporteClientes analytics={data} />;
    default:
      return null;
  }
}

function ReporteVentas({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
          <p className="text-xs font-bold text-indigo-400 uppercase">Facturación Total</p>
          <h3 className="text-3xl font-black text-indigo-900 mt-2">{formatCurrency(analytics.totalVentas)}</h3>
          <p className="text-sm text-indigo-600 mt-1">En {analytics.totalPedidos} pedidos completados</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <p className="text-xs font-bold text-emerald-400 uppercase">Ticket Promedio</p>
          <h3 className="text-3xl font-black text-emerald-900 mt-2">{formatCurrency(analytics.ticketPromedio)}</h3>
          <p className="text-sm text-emerald-600 mt-1">Eficiencia de venta por cliente</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <p className="text-xs font-bold text-amber-400 uppercase">Envíos a Domicilio</p>
          <h3 className="text-3xl font-black text-amber-900 mt-2">{analytics.pedidosDomicilio}</h3>
          <p className="text-sm text-amber-600 mt-1">{analytics.totalPedidos > 0 ? ((analytics.pedidosDomicilio / analytics.totalPedidos) * 100).toFixed(0) : 0}% de la operación total</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Tendencia Diaria de Ingresos
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.ventasPorDia}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              formatter={(v) => [formatCurrency(v as number), 'Ventas']}
            />
            <Line type="monotone" dataKey="ventas" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden border border-gray-100 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-gray-900 uppercase tracking-tighter">Fecha</th>
              <th className="px-6 py-4 text-right font-bold text-gray-900 uppercase tracking-tighter">Ventas</th>
              <th className="px-6 py-4 text-right font-bold text-gray-900 uppercase tracking-tighter">Pedidos</th>
              <th className="px-6 py-4 text-right font-bold text-gray-900 uppercase tracking-tighter">T. Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {analytics.ventasPorDia.map((row: any) => (
              <tr key={row.fecha} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{row.fecha}</td>
                <td className="px-6 py-4 text-right font-bold text-indigo-600">{formatCurrency(row.ventas)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{row.pedidos}</td>
                <td className="px-6 py-4 text-right text-gray-400">{formatCurrency(row.pedidos > 0 ? row.ventas / row.pedidos : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteProductos({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-blue-200 shadow-lg">
          <p className="text-blue-100 text-xs font-bold uppercase">Top Producto</p>
          <h3 className="text-xl font-bold mt-1 line-clamp-1">{analytics.topProductos[0]?.nombre || 'N/A'}</h3>
          <p className="text-2xl font-black mt-2">{analytics.topProductos[0]?.cantidad || 0} Uds.</p>
        </div>
      </div>

      <div className="overflow-hidden border border-gray-100 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-gray-900">Producto</th>
              <th className="px-6 py-4 text-left font-bold text-gray-900">Categoría</th>
              <th className="px-6 py-4 text-right font-bold text-gray-900">Cantidad</th>
              <th className="px-6 py-4 text-right font-bold text-gray-900">Total Ingresos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {analytics.topProductos.map((p: any) => (
              <tr key={p.nombre} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-900">{p.nombre}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">{p.categoria}</span></td>
                <td className="px-6 py-4 text-right font-medium">{p.cantidad}</td>
                <td className="px-6 py-4 text-right font-bold text-indigo-600">{formatCurrency(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteClientes({ analytics }: { analytics: any }) {
  return (
    <div className="overflow-hidden border border-gray-100 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-4 text-left font-bold text-gray-900">Cliente</th>
            <th className="px-6 py-4 text-right font-bold text-gray-900">Pedidos</th>
            <th className="px-6 py-4 text-right font-bold text-gray-900">Monto Comprado</th>
            <th className="px-6 py-4 text-right font-bold text-gray-900">Más Reciente</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {analytics.topClientes.map((c: any) => (
            <tr key={c.nombre} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-bold text-gray-900">{c.nombre}</td>
              <td className="px-6 py-4 text-right font-medium">{c.pedidos}</td>
              <td className="px-6 py-4 text-right font-bold text-indigo-600">{formatCurrency(c.total)}</td>
              <td className="px-6 py-4 text-right text-gray-500 text-xs">
                {c.ultimaCompra ? formatDateTimeMX(c.ultimaCompra) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}