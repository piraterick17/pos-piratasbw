import React, { useEffect } from 'react';
import { Receipt, AlertCircle, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import { useCuentasPorPagarStore } from '../lib/store/cuentasPorPagarStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';

export function WidgetCuentasPorPagar() {
  const { cuentas, fetchCuentas, getEstadisticas } = useCuentasPorPagarStore();

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  const estadisticas = getEstadisticas();

  const cuentasVencidas = cuentas.filter(c => c.estatus === 'vencido');
  const cuentasPorVencer = cuentas.filter(c => {
    if (c.estatus === 'pagado_completo' || c.estatus === 'vencido') return false;
    const hoy = new Date();
    const vencimiento = new Date(c.fecha_vencimiento);
    const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias >= 0 && diffDias <= 7;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 col-span-full lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Receipt className="w-5 h-5 mr-2 text-blue-600" />
          Cuentas por Pagar
        </h3>
        <a
          href="#cuentas-por-pagar"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          onClick={() => window.location.reload()}
        >
          Ver todas
          <ExternalLink className="w-4 h-4 ml-1" />
        </a>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Vencido</p>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(estadisticas.totalVencido)}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {estadisticas.cantidadVencidas} cuenta(s)
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Por Vencer (7d)</p>
              <p className="text-2xl font-bold text-orange-900">
                {formatCurrency(estadisticas.totalPorVencer)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {cuentasPorVencer.length} cuenta(s)
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Pendiente</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(estadisticas.totalPendiente)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {estadisticas.cantidadCuentas} cuenta(s)
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">Total Cuentas</p>
              <p className="text-2xl font-bold text-gray-900">
                {cuentas.length}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Todas las cuentas
              </p>
            </div>
            <Receipt className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Alertas */}
      {cuentasVencidas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Cuentas Vencidas - Acción Requerida
              </p>
              <div className="space-y-2">
                {cuentasVencidas.slice(0, 3).map((cuenta) => (
                  <div key={cuenta.id} className="flex justify-between items-center text-sm">
                    <span className="text-red-700">
                      {cuenta.proveedor?.nombre || 'Proveedor'} - {cuenta.referencia_compra || 'Sin ref'}
                    </span>
                    <span className="font-semibold text-red-900">
                      {formatCurrency(cuenta.saldo_pendiente)}
                    </span>
                  </div>
                ))}
                {cuentasVencidas.length > 3 && (
                  <p className="text-xs text-red-600 mt-2">
                    +{cuentasVencidas.length - 3} cuenta(s) vencida(s) más
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Próximos Vencimientos */}
      {cuentasPorVencer.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900 mb-2">
                Próximos Vencimientos (7 días)
              </p>
              <div className="space-y-2">
                {cuentasPorVencer.slice(0, 3).map((cuenta) => (
                  <div key={cuenta.id} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <span className="text-yellow-700">
                        {cuenta.proveedor?.nombre || 'Proveedor'} - {cuenta.referencia_compra || 'Sin ref'}
                      </span>
                      <p className="text-xs text-yellow-600">
                        Vence: {formatDate(cuenta.fecha_vencimiento)}
                      </p>
                    </div>
                    <span className="font-semibold text-yellow-900 ml-2">
                      {formatCurrency(cuenta.saldo_pendiente)}
                    </span>
                  </div>
                ))}
                {cuentasPorVencer.length > 3 && (
                  <p className="text-xs text-yellow-600 mt-2">
                    +{cuentasPorVencer.length - 3} cuenta(s) por vencer
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sin alertas */}
      {cuentasVencidas.length === 0 && cuentasPorVencer.length === 0 && cuentas.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-lg">✓</span>
            </div>
            <p className="text-sm text-green-700">
              Todas las cuentas están al corriente. No hay vencimientos próximos.
            </p>
          </div>
        </div>
      )}

      {/* Sin cuentas */}
      {cuentas.length === 0 && (
        <div className="text-center py-8">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No hay cuentas por pagar registradas</p>
        </div>
      )}
    </div>
  );
}
