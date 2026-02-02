import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useFinanzasStore } from '../../lib/store/finanzasStore';
import { useCuentasPorPagarStore } from '../../lib/store/cuentasPorPagarStore';
import { formatCurrency, formatDate } from '../../lib/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export function FinancialDashboard() {
  const { movimientos, categorias, fetchMovimientos, fetchCategorias } = useFinanzasStore();
  const { cuentas, fetchCuentas, getEstadisticas } = useCuentasPorPagarStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const fechaInicio = primerDiaMes.toISOString().split('T')[0];
      const fechaFin = hoy.toISOString().split('T')[0];

      await Promise.all([
        fetchMovimientos(fechaInicio, fechaFin),
        fetchCuentas(),
        fetchCategorias()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMovimientos, fetchCuentas]);

  const estadisticasCxP = getEstadisticas();

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
  const balance = totalIngresos - totalEgresos;

  const cuentasProximasVencer = cuentas
    .filter(c => c.estatus !== 'pagado_completo')
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
    .slice(0, 5);

// Lógica corregida: Buscamos el nombre usando el ID
  const gastosPorCategoria = movimientos
    .filter(m => m.tipo === 'egreso')
    .reduce((acc, m) => {
      // Buscamos la categoría en el array que acabamos de cargar
      const catObj = categorias.find(c => c.id === m.categoria_id);
      const nombreCategoria = catObj ? catObj.nombre : 'Sin categoría';
      
      acc[nombreCategoria] = (acc[nombreCategoria] || 0) + m.monto;
      return acc;
    }, {} as Record<string, number>);

  const dataPie = Object.entries(gastosPorCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value); // Ordenamos de mayor a menor gasto

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const getVencimientoColor = (fechaVencimiento: string, estatus: string) => {
    if (estatus === 'pagado_completo') return 'text-gray-500';
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return 'text-red-600 font-semibold';
    if (diffDias <= 3) return 'text-orange-600 font-semibold';
    if (diffDias <= 7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos financieros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-green-50 rounded-lg p-4 md:p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-green-700">Ingresos del Mes</h3>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900">{formatCurrency(totalIngresos)}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 md:p-6 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-red-700">Egresos del Mes</h3>
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-900">{formatCurrency(totalEgresos)}</p>
        </div>

        <div className={`rounded-lg p-4 md:p-6 border ${balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-xs sm:text-sm font-medium ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balance Neto</h3>
            <DollarSign className={`w-4 h-4 sm:w-5 sm:h-5 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
          </div>
          <p className={`text-lg sm:text-xl md:text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>{formatCurrency(balance)}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 md:p-6 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-yellow-700">Total por Pagar</h3>
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-900">{formatCurrency(estadisticasCxP.totalPendiente)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Vencido</h3>
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
          </div>
          <p className="text-base sm:text-lg md:text-xl font-bold text-red-600">{formatCurrency(estadisticasCxP.totalVencido)}</p>
          <p className="text-xs text-gray-500 mt-1">{estadisticasCxP.cuentasVencidas} cuentas</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Vence Pronto (7d)</h3>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          </div>
          <p className="text-base sm:text-lg md:text-xl font-bold text-orange-600">{formatCurrency(estadisticasCxP.totalProximoVencer)}</p>
          <p className="text-xs text-gray-500 mt-1">{estadisticasCxP.cuentasProximasVencer} cuentas</p>
        </div>

        <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-gray-700">Pagado Este Mes</h3>
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          </div>
          <p className="text-base sm:text-lg md:text-xl font-bold text-green-600">{formatCurrency(estadisticasCxP.totalPagadoMes)}</p>
          <p className="text-xs text-gray-500 mt-1">{estadisticasCxP.cuentasPagadasMes} pagos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Distribución de Gastos</h3>
          {dataPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dataPie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={window.innerWidth < 640 ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p className="text-sm">No hay datos de gastos este mes</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mr-2" />
            Próximas Cuentas por Pagar
          </h3>
          {cuentasProximasVencer.length > 0 ? (
            <div className="space-y-2 md:space-y-3 max-h-80 overflow-y-auto">
              {cuentasProximasVencer.map((cuenta) => (
                <div
                  key={cuenta.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{cuenta.proveedor?.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{cuenta.referencia_compra || `Ref: ${cuenta.id}`}</p>
                    <p className={`text-xs mt-1 ${getVencimientoColor(cuenta.fecha_vencimiento, cuenta.estatus)}`}>
                      Vence: {formatDate(cuenta.fecha_vencimiento)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-gray-900 text-sm sm:text-base">{formatCurrency(cuenta.saldo_pendiente)}</p>
                    {cuenta.estatus === 'vencido' && (
                      <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full mt-1">
                        Vencido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No hay cuentas pendientes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
