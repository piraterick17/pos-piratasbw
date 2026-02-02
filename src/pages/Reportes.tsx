import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Calendar,
  Filter,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  FileText,
  Download,
  Search,
  Coffee
} from 'lucide-react';
import { usePedidosStore } from '../lib/store/pedidosStore';
import { useProductosStore } from '../lib/store/productosStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
// [CHANGE] Importamos las utilidades corregidas
import { getLocalDateStr, getMexicoDateToUTC, getLocalDateTime } from '../lib/utils/time';
import { calculateVentasTotales, calculateProductosVendidos } from '../lib/utils/ventasCalculations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type TipoReporte = 'ventas' | 'productos' | 'clientes' | null;

export function Reportes() {
  const { fetchPedidosByDateRange, isLoading } = usePedidosStore();
  const { fetchProductosConStock } = useProductosStore();
  
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [datosReporte, setDatosReporte] = useState<any[]>([]);
  const [pedidosRaw, setPedidosRaw] = useState<any[]>([]);
  const [generandoReporte, setGenerandoReporte] = useState(false);
  const [productosStockBajo, setProductosStockBajo] = useState<any[]>([]);

  // Establecer fechas por defecto
  useEffect(() => {
    // Usamos new Date() normal, getLocalDateStr se encarga del offset
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    setFechaFin(getLocalDateStr(hoy));
    setFechaInicio(getLocalDateStr(hace30Dias));
  }, []);

  const tiposReporte = [
    {
      id: 'ventas' as TipoReporte,
      titulo: 'Ventas',
      descripcion: 'Análisis de ventas por período',
      icono: TrendingUp,
      color: 'bg-blue-600 hover:bg-blue-700',
      colorIcon: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'productos' as TipoReporte,
      titulo: 'Productos',
      descripcion: 'Rendimiento de productos',
      icono: Package,
      color: 'bg-green-600 hover:bg-green-700',
      colorIcon: 'bg-green-100 text-green-600'
    },
    {
      id: 'clientes' as TipoReporte,
      titulo: 'Clientes',
      descripcion: 'Análisis de clientes',
      icono: Users,
      color: 'bg-purple-600 hover:bg-purple-700',
      colorIcon: 'bg-purple-100 text-purple-600'
    }
  ];

  const generarReporte = async () => {
    if (!tipoReporte || !fechaInicio || !fechaFin) {
      return;
    }

    setGenerandoReporte(true);
    try {
      // 1. Inicio: 00:00 MX -> UTC
      const inicioUTC = getMexicoDateToUTC(fechaInicio);
      
      // 2. Fin: Necesitamos cubrir hasta las 23:59:59 del día fin en MX.
      // getMexicoDateToUTC devuelve el INICIO (06:00 UTC).
      // Sumamos 23h 59m 59s para cubrir el día completo.
      const finDateObj = new Date(getMexicoDateToUTC(fechaFin));
      finDateObj.setUTCHours(finDateObj.getUTCHours() + 23, 59, 59, 999);
      const finUTC = finDateObj.toISOString();

      console.log(`[Reportes] Query Range (UTC): ${inicioUTC} - ${finUTC}`);

      const pedidos = await fetchPedidosByDateRange(inicioUTC, finUTC);
      setPedidosRaw(pedidos);

      switch (tipoReporte) {
        case 'ventas':
          setDatosReporte(generarReporteVentas(pedidos));
          break;
        case 'productos':
          setDatosReporte(generarReporteProductos(pedidos));
          const productosConStock = await fetchProductosConStock();
          const stockBajo = productosConStock.filter(p =>
            p.controlar_stock && (p.stock_actual || 0) <= (p.stock_minimo || 0)
          );
          setProductosStockBajo(stockBajo);
          break;
        case 'clientes':
          setDatosReporte(generarReporteClientes(pedidos));
          break;
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
    } finally {
      setGenerandoReporte(false);
    }
  };

  const generarReporteVentas = (pedidos: any[]) => {
    const resultado = calculateVentasTotales(pedidos, {
      estados: ['Completado', 'En Reparto']
    });

    return resultado.desglosePorDia.map(dia => ({
      ...dia,
      // Al mostrar la fecha en la gráfica, nos aseguramos que se vea bien
      // Como 'dia.fecha' ya viene corregido por calculateVentasTotales (gracias a time.ts nuevo)
      // solo necesitamos formatearlo para lectura humana.
      fecha: formatDateLabel(dia.fecha)
    }));
  };
  
  // Helper para formatear "2026-01-05" a "05 Ene" de forma segura
  const formatDateLabel = (dateStr: string) => {
      const parts = dateStr.split('-'); // [2026, 01, 05]
      if (parts.length !== 3) return dateStr;
      const day = parts[2];
      const monthIndex = parseInt(parts[1]) - 1;
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${day} ${months[monthIndex]}`;
  };

  const generarReporteProductos = (pedidos: any[]) => {
    return calculateProductosVendidos(pedidos, {
      estados: ['Completado', 'En Reparto']
    });
  };

  const generarReporteClientes = (pedidos: any[]) => {
    const pedidosFiltrados = pedidos.filter(p =>
      (p.estado_nombre === 'Completado' || p.estado_nombre === 'En Reparto') && !p.deleted_at
    );
    const clientesData: { [key: string]: any } = {};

    pedidosFiltrados.forEach(pedido => {
      const clienteId = pedido.cliente_id || 'sin-cliente';
      const clienteNombre = pedido.cliente_nombre || 'Público General';

      if (!clientesData[clienteId]) {
        clientesData[clienteId] = {
          nombre: clienteNombre,
          pedidos: 0,
          total: 0,
          ultimaCompra: null
        };
      }

      clientesData[clienteId].pedidos += 1;
      clientesData[clienteId].total += pedido.total || 0;

      const fechaPedido = new Date(pedido.insert_date);
      if (!clientesData[clienteId].ultimaCompra || fechaPedido > new Date(clientesData[clienteId].ultimaCompra)) {
        clientesData[clienteId].ultimaCompra = pedido.insert_date;
      }
    });

    return Object.values(clientesData)
      .sort((a: any, b: any) => b.total - a.total);
  };

  const exportarReporte = () => {
    if (!datosReporte.length) return;
    
    const csvContent = convertirACSV(datosReporte, tipoReporte);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte-${tipoReporte}-${fechaInicio}-${fechaFin}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const convertirACSV = (datos: any[], tipo: TipoReporte) => {
    if (!datos.length) return '';
    
    let headers: string[] = [];
    let rows: string[][] = [];
    
    switch (tipo) {
      case 'ventas':
        headers = ['Fecha', 'Ventas', 'Pedidos'];
        rows = datos.map(d => [d.fecha, d.ventas.toString(), d.pedidos.toString()]);
        break;
      case 'productos':
        headers = ['Producto', 'Categoría', 'Cantidad Vendida', 'Total Ventas', 'Pedidos'];
        rows = datos.map(d => [d.nombre, d.categoria, d.cantidad.toString(), d.total.toString(), d.pedidos.toString()]);
        break;
      case 'clientes':
        headers = ['Cliente', 'Pedidos', 'Total Gastado', 'Última Compra'];
        rows = datos.map(d => [d.nombre, d.pedidos.toString(), d.total.toString(), d.ultimaCompra || '']);
        break;
    }
    
    const csvRows = [headers.join(','), ...rows.map(row => row.join(','))];
    return csvRows.join('\n');
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart className="w-8 h-8 mr-3 text-blue-600" />
          Reportes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Genera reportes detallados de ventas, productos y clientes.
        </p>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Rango de Fechas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generarReporte}
              disabled={!tipoReporte || !fechaInicio || !fechaFin || generandoReporte}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {generandoReporte ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Generar Reporte
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tipos de Reporte */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Tipos de Reporte
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiposReporte.map((tipo) => {
            const IconComponent = tipo.icono;
            const isSelected = tipoReporte === tipo.id;
            
            return (
              <button
                key={tipo.id}
                onClick={() => setTipoReporte(tipo.id)}
                className={`p-6 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tipo.colorIcon}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="ml-3 text-left">
                    <h3 className="font-semibold text-gray-900">{tipo.titulo}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-left">{tipo.descripcion}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área de Resultados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Resultados del Reporte
          </h2>
          
          {datosReporte.length > 0 && (
            <button
              onClick={exportarReporte}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
          )}
        </div>

        {!tipoReporte || !fechaInicio || !fechaFin ? (
          <div className="text-center py-12">
            <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecciona un tipo de reporte y un rango de fechas para comenzar
            </h3>
            <p className="text-gray-500">
              Elige el tipo de análisis que deseas realizar y define el período de tiempo.
            </p>
          </div>
        ) : datosReporte.length === 0 && !generandoReporte ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay datos para el período seleccionado
            </h3>
            <p className="text-gray-500">
              Intenta con un rango de fechas diferente o verifica que haya pedidos en este período.
            </p>
          </div>
        ) : (
          <ReporteResultados tipo={tipoReporte} datos={datosReporte} pedidosRaw={pedidosRaw} />
        )}
      </div>
      </div>
    </div>
  );
}

// Componente para mostrar los resultados según el tipo de reporte
function ReporteResultados({ tipo, datos, pedidosRaw }: { tipo: TipoReporte; datos: any[]; pedidosRaw: any[] }) {
  if (!datos.length) return null;

  switch (tipo) {
    case 'ventas':
      return <ReporteVentas datos={datos} pedidosRaw={pedidosRaw} />;
    case 'productos':
      return <ReporteProductos datos={datos} />;
    case 'clientes':
      return <ReporteClientes datos={datos} />;
    default:
      return null;
  }
}

function ReporteVentas({ datos, pedidosRaw }: { datos: any[]; pedidosRaw: any[] }) {
  const totalVentas = datos.reduce((sum, d) => sum + d.ventas, 0);
  const totalPedidos = datos.reduce((sum, d) => sum + d.pedidos, 0);
  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

  const ventaDesayunos = pedidosRaw
    .filter(p => (p.estado_nombre === 'Completado' || p.estado_nombre === 'En Reparto') && !p.deleted_at)
    .reduce((total, pedido) => {
      const desayunosTotal = (pedido.detalles || []).reduce((sum: number, detalle: any) => {
        const categoriaId = detalle?.producto?.categoria_id;
        const categoriaNombre = detalle?.producto?.categoria?.nombre;
        const isDesayunos = categoriaNombre === 'Desayunos' || categoriaId === 54;
        return sum + (isDesayunos ? (Number(detalle?.subtotal) || 0) : 0);
      }, 0);
      return total + desayunosTotal;
    }, 0);

  const porcentajeDesayunos = totalVentas > 0 ? (ventaDesayunos / totalVentas) * 100 : 0;

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-blue-600">Total Ventas</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalVentas)}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-green-600">Total Pedidos</p>
              <p className="text-xl font-bold text-green-900">{totalPedidos}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-purple-600">Ticket Promedio</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(ticketPromedio)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Coffee className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-orange-600">Venta Desayunos</p>
              <p className="text-xl font-bold text-orange-900">{formatCurrency(ventaDesayunos)}</p>
              <p className="text-xs text-orange-600 mt-1">{porcentajeDesayunos.toFixed(1)}% del total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Tendencia de Ventas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center mb-6">
          <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Tendencia de Ventas</h3>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="fecha" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Ventas']}
              labelFormatter={(label) => `Fecha: ${label}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="ventas" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
              name="Ventas"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla de datos */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ventas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pedidos
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket Promedio
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {datos.map((fila, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {fila.fecha}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(fila.ventas)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {fila.pedidos}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(fila.pedidos > 0 ? fila.ventas / fila.pedidos : 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteProductos({ datos }: { datos: any[] }) {
  const productoEstrella = datos.length > 0 ? datos[0] : null;
  const totalVentas = datos.reduce((sum, prod) => sum + prod.total, 0);

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-blue-600">Producto Estrella</p>
              <p className="text-xl font-bold text-blue-900">
                {productoEstrella ? productoEstrella.nombre : 'N/A'}
              </p>
              {productoEstrella && (
                <p className="text-sm text-blue-700">
                  {productoEstrella.cantidad} unidades vendidas
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-green-600">Producto Más Rentable</p>
              <p className="text-xl font-bold text-green-900">
                {productoEstrella ? productoEstrella.nombre : 'N/A'}
              </p>
              {totalVentas > 0 && (
                <p className="text-sm text-green-700">
                  {formatCurrency(totalVentas)} en ventas totales
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad Vendida
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Ventas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pedidos
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {datos.map((producto, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {producto.nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {producto.categoria}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {producto.cantidad}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(producto.total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {producto.pedidos}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReporteClientes({ datos }: { datos: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cliente
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pedidos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Gastado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Última Compra
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {datos.map((cliente, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {cliente.nombre}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {cliente.pedidos}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(cliente.total)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {cliente.ultimaCompra ? getLocalDateTime(cliente.ultimaCompra) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}