import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, DollarSign, Eye, Clock } from 'lucide-react';
import { useCuentasPorPagarStore } from '../../lib/store/cuentasPorPagarStore';
import { useProveedoresStore } from '../../lib/store/proveedoresStore';
import { formatCurrency, formatDate } from '../../lib/utils/formatters';
import { RegistrarPagoModal } from '../RegistrarPagoModal';
import { NuevaCuentaPorPagarModal } from './NuevaCuentaPorPagarModal';
import { DetallesPagosCuentaModal } from './DetallesPagosCuentaModal';

export function CuentasPorPagarTab() {
  const {
    cuentas,
    isLoading,
    fetchCuentas,
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
  const [isNuevaCuentaModalOpen, setIsNuevaCuentaModalOpen] = useState(false);
  const [isDetallesModalOpen, setIsDetallesModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
    setSearchTerm('');
    fetchCuentas();
  };

  const handleRegistrarPago = (cuenta: any) => {
    setSelectedCuenta(cuenta);
    setIsPagoModalOpen(true);
  };

  const handleVerDetalles = (cuenta: any) => {
    setSelectedCuenta(cuenta);
    setIsDetallesModalOpen(true);
  };

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
      pagado_parcial: 'Parcial',
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Gestión de Cuentas por Pagar</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Administra las deudas con proveedores</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => marcarCuentasVencidas()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Clock className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Actualizar</span>
            <span className="sm:hidden">Act.</span>
          </button>
          <button
            onClick={() => setIsNuevaCuentaModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 md:p-4 border border-gray-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full mb-3 md:hidden"
        >
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          <Filter className="w-4 h-4 text-gray-600" />
        </button>

        <div className={`${showFilters ? 'block' : 'hidden'} md:block space-y-3 md:space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Proveedor</label>
              <select
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Estatus</label>
              <select
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagado_parcial">Pago Parcial</option>
                <option value="vencido">Vencido</option>
                <option value="pagado_completo">Pagado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <button
                onClick={handleAplicarFiltros}
                className="flex-1 bg-blue-600 text-white py-2 px-3 text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </button>
              <button
                onClick={handleLimpiarFiltros}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por proveedor o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando cuentas...</p>
        </div>
      ) : cuentasFiltradas.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg border border-gray-200 text-gray-500">
          <p className="text-sm">No se encontraron cuentas</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg border border-gray-200">
            <div className="overflow-auto max-h-[calc(100vh-400px)] min-h-[400px]">
              <table className="w-full">
                <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cuentasFiltradas.map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-gray-900">{cuenta.proveedor?.nombre}</p>
                        <p className="text-xs text-gray-500">{cuenta.proveedor?.contacto}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">{cuenta.referencia_compra || `#${cuenta.id}`}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900">{formatCurrency(cuenta.monto_total)}</td>
                      <td className="px-3 py-3 text-sm text-green-600">{formatCurrency(cuenta.monto_pagado)}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-red-600">{formatCurrency(cuenta.saldo_pendiente)}</td>
                      <td className="px-3 py-3">
                        <p className={`text-sm ${getVencimientoColor(cuenta.fecha_vencimiento, cuenta.estatus)}`}>
                          {formatDate(cuenta.fecha_vencimiento)}
                        </p>
                      </td>
                      <td className="px-3 py-3">{getEstatusBadge(cuenta.estatus)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {cuenta.estatus !== 'pagado_completo' && (
                            <button
                              onClick={() => handleRegistrarPago(cuenta)}
                              className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              <DollarSign className="w-3 h-3 mr-1" />
                              Pagar
                            </button>
                          )}
                          <button
                            onClick={() => handleVerDetalles(cuenta)}
                            className="inline-flex items-center px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3 overflow-auto max-h-[calc(100vh-350px)] min-h-[400px] pr-2">
            {cuentasFiltradas.map((cuenta) => (
              <div key={cuenta.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{cuenta.proveedor?.nombre}</h3>
                    <p className="text-xs text-gray-500">{cuenta.referencia_compra || `#${cuenta.id}`}</p>
                  </div>
                  {getEstatusBadge(cuenta.estatus)}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(cuenta.monto_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Saldo</p>
                    <p className="font-semibold text-red-600">{formatCurrency(cuenta.saldo_pendiente)}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500">Vencimiento</p>
                  <p className={`text-sm ${getVencimientoColor(cuenta.fecha_vencimiento, cuenta.estatus)}`}>
                    {formatDate(cuenta.fecha_vencimiento)}
                  </p>
                </div>

                <div className="flex gap-2">
                  {cuenta.estatus !== 'pagado_completo' && (
                    <button
                      onClick={() => handleRegistrarPago(cuenta)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <DollarSign className="w-4 h-4 mr-1.5" />
                      Pagar
                    </button>
                  )}
                  <button
                    onClick={() => handleVerDetalles(cuenta)}
                    className={`${cuenta.estatus === 'pagado_completo' ? 'flex-1' : ''} inline-flex items-center justify-center px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors`}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isPagoModalOpen && selectedCuenta && (
        <RegistrarPagoModal
          isOpen={isPagoModalOpen}
          cuenta={selectedCuenta}
          onClose={() => {
            setIsPagoModalOpen(false);
            setSelectedCuenta(null);
          }}
          onSuccess={() => {
            fetchCuentas();
          }}
        />
      )}

      {isNuevaCuentaModalOpen && (
        <NuevaCuentaPorPagarModal
          onClose={() => {
            setIsNuevaCuentaModalOpen(false);
            fetchCuentas();
          }}
        />
      )}

      {isDetallesModalOpen && selectedCuenta && (
        <DetallesPagosCuentaModal
          cuenta={selectedCuenta}
          onClose={() => {
            setIsDetallesModalOpen(false);
            setSelectedCuenta(null);
          }}
        />
      )}
    </div>
  );
}
