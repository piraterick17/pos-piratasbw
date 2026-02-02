import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  Filter,
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
  Search,
} from 'lucide-react';
import { useCuentasPorPagarStore } from '../lib/store/cuentasPorPagarStore';
import { useProveedoresStore } from '../lib/store/proveedoresStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import { RegistrarPagoModal } from '../components/RegistrarPagoModal';

export function CuentasPorPagar() {
  const {
    cuentas,
    isLoading,
    fetchCuentas,
    getEstadisticas,
    marcarCuentasVencidas,
  } = useCuentasPorPagarStore();

  const { proveedores, fetchProveedores } = useProveedoresStore();

  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuenta, setSelectedCuenta] = useState<any>(null);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);

  useEffect(() => {
    fetchProveedores();
    fetchCuentas();
    marcarCuentasVencidas();
  }, []);

  const handleAplicarFiltros = () => {
    const filtros: any = {};
    if (filtroProveedor) filtros.proveedor_id = parseInt(filtroProveedor);
    if (filtroEstatus) filtros.estatus = filtroEstatus;
    if (fechaDesde) filtros.fecha_desde = fechaDesde;
    if (fechaHasta) filtros.fecha_hasta = fechaHasta;
    fetchCuentas(filtros);
  };

  const handleLimpiarFiltros = () => {
    setFiltroProveedor('');
    setFiltroEstatus('');
    setFechaDesde('');
    setFechaHasta('');
    fetchCuentas();
  };

  const handleRegistrarPago = (cuenta: any) => {
    setSelectedCuenta(cuenta);
    setIsPagoModalOpen(true);
  };

  const estadisticas = getEstadisticas();

  const cuentasFiltradas = cuentas.filter(cuenta => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const proveedorNombre = cuenta.proveedor?.nombre?.toLowerCase() || '';
    const referencia = cuenta.referencia_compra?.toLowerCase() || '';
    return proveedorNombre.includes(searchLower) || referencia.includes(searchLower);
  });

  const getEstatusBadge = (estatus: string) => {
    const badges = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      pagado_parcial: 'bg-blue-100 text-blue-800',
      pagado_completo: 'bg-green-100 text-green-800',
      vencido: 'bg-red-100 text-red-800',
    };
    const labels = {
      pendiente: 'Pendiente',
      pagado_parcial: 'Pago Parcial',
      pagado_completo: 'Pagado',
      vencido: 'Vencido',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${badges[estatus as keyof typeof badges]}`}>
        {labels[estatus as keyof typeof labels]}
      </span>
    );
  };

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <CreditCard className="w-8 h-8 mr-3 text-blue-600" />
          Cuentas por Pagar
        </h1>
        <button
          onClick={() => marcarCuentasVencidas()}
          className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Clock className="w-4 h-4 mr-2" />
          Actualizar Vencidas
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pendiente</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(estadisticas.totalPendiente)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vencido</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(estadisticas.totalVencido)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Por Vencer (7d)</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(estadisticas.totalPorVencer)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cuentas Activas</p>
              <p className="text-2xl font-bold text-gray-900">
                {estadisticas.cantidadCuentas}
              </p>
            </div>
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cuentas Vencidas</p>
              <p className="text-2xl font-bold text-red-600">
                {estadisticas.cantidadVencidas}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor
            </label>
            <select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {proveedores.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estatus
            </label>
            <select
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado_parcial">Pago Parcial</option>
              <option value="vencido">Vencido</option>
              <option value="pagado_completo">Pagado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleAplicarFiltros}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </button>
            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Cuentas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Listado de Cuentas por Pagar</h2>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando cuentas...</p>
            </div>
          ) : cuentasFiltradas.length === 0 ? (
            <div className="text-center p-8">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay cuentas por pagar
              </h3>
              <p className="text-gray-500">
                {searchTerm || filtroProveedor || filtroEstatus
                  ? 'No se encontraron cuentas con los filtros aplicados.'
                  : 'Todas las cuentas están al corriente.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Referencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    F. Compra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Monto Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estatus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cuentasFiltradas.map((cuenta) => (
                  <tr key={cuenta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {cuenta.proveedor?.nombre || 'N/A'}
                        </div>
                        {cuenta.proveedor?.contacto_nombre && (
                          <div className="text-sm text-gray-500">
                            {cuenta.proveedor.contacto_nombre}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {cuenta.referencia_compra || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(cuenta.fecha_compra)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={getVencimientoColor(cuenta.fecha_vencimiento, cuenta.estatus)}>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(cuenta.fecha_vencimiento)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(cuenta.monto_total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      {formatCurrency(cuenta.monto_pagado)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      {formatCurrency(cuenta.saldo_pendiente)}
                    </td>
                    <td className="px-6 py-4">{getEstatusBadge(cuenta.estatus)}</td>
                    <td className="px-6 py-4">
                      {cuenta.estatus !== 'pagado_completo' && (
                        <button
                          onClick={() => handleRegistrarPago(cuenta)}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Pago */}
      <RegistrarPagoModal
        isOpen={isPagoModalOpen}
        onClose={() => {
          setIsPagoModalOpen(false);
          setSelectedCuenta(null);
        }}
        cuenta={selectedCuenta}
        onSuccess={() => {
          fetchCuentas();
        }}
      />
    </div>
  );
}
