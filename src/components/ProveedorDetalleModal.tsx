import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, FileText, DollarSign, Calendar, ShoppingCart, Receipt, TrendingDown, AlertCircle } from 'lucide-react';
import { type Proveedor } from '../lib/store/proveedoresStore';
import { useCuentasPorPagarStore } from '../lib/store/cuentasPorPagarStore';
import { useInsumosStore } from '../lib/store/insumosStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';

interface ProveedorDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor: Proveedor | null;
}

type TabType = 'general' | 'compras' | 'cuentas' | 'estado';

export function ProveedorDetalleModal({ isOpen, onClose, proveedor }: ProveedorDetalleModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const { cuentas, fetchCuentas } = useCuentasPorPagarStore();
  const { movimientos, fetchMovimientosInsumo } = useInsumosStore();

  useEffect(() => {
    if (isOpen && proveedor) {
      fetchCuentas({ proveedor_id: proveedor.id });
      fetchMovimientosInsumo();
    }
  }, [isOpen, proveedor]);

  if (!isOpen || !proveedor) return null;

  const proveedorCuentas = cuentas.filter(c => c.proveedor_id === proveedor.id);
  const proveedorCompras = movimientos.filter(
    m => m.tipo_movimiento === 'compra' && m.proveedor_id === proveedor.id
  );

  const totalPendiente = proveedorCuentas
    .filter(c => c.estatus !== 'pagado_completo')
    .reduce((sum, c) => sum + c.saldo_pendiente, 0);

  const totalComprado = proveedorCompras.reduce((sum, c) => sum + (c.costo_total || 0), 0);

  const cuentasVencidas = proveedorCuentas.filter(c => c.estatus === 'vencido').length;

  const creditoDisponible = (proveedor.limite_credito || 0) - totalPendiente;

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: User },
    { id: 'compras' as TabType, label: 'Compras', icon: ShoppingCart, badge: proveedorCompras.length },
    { id: 'cuentas' as TabType, label: 'Cuentas por Pagar', icon: Receipt, badge: proveedorCuentas.length },
    { id: 'estado' as TabType, label: 'Estado de Cuenta', icon: FileText },
  ];

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{proveedor.nombre}</h2>
              {proveedor.contacto_nombre && (
                <p className="text-sm text-gray-600">Contacto: {proveedor.contacto_nombre}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-1 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Información de Contacto */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Información de Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                  {proveedor.telefono && (
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Teléfono</p>
                        <p className="font-medium">{proveedor.telefono}</p>
                      </div>
                    </div>
                  )}
                  {proveedor.email && (
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{proveedor.email}</p>
                      </div>
                    </div>
                  )}
                  {proveedor.direccion && (
                    <div className="flex items-start col-span-2">
                      <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Dirección</p>
                        <p className="font-medium">{proveedor.direccion}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Términos de Crédito */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Términos de Crédito
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Días de Crédito</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {proveedor.dias_credito_default || 30} días
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Límite de Crédito</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(proveedor.limite_credito || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Crédito Utilizado</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalPendiente)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Crédito Disponible</p>
                    <p className={`text-2xl font-bold ${creditoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(creditoDisponible)}
                    </p>
                  </div>
                </div>
                {creditoDisponible < 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm text-red-700">
                      El proveedor ha excedido su límite de crédito
                    </span>
                  </div>
                )}
              </div>

              {/* Notas */}
              {proveedor.notas && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Notas
                  </h3>
                  <p className="text-gray-700">{proveedor.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Compras */}
          {activeTab === 'compras' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Historial de Compras</h3>
                <div className="text-sm text-gray-600">
                  Total comprado: <span className="font-bold text-gray-900">{formatCurrency(totalComprado)}</span>
                </div>
              </div>

              {proveedorCompras.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay compras registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proveedorCompras.map((compra) => (
                    <div key={compra.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {compra.insumo?.nombre || 'Insumo desconocido'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Cantidad: {Math.abs(compra.cantidad)} {compra.insumo?.unidad_medida}
                          </p>
                          {compra.referencia_compra && (
                            <p className="text-sm text-gray-500">
                              Ref: {compra.referencia_compra}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {formatCurrency(compra.costo_total || 0)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(compra.fecha)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Cuentas por Pagar */}
          {activeTab === 'cuentas' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Cuentas por Pagar</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-gray-600">
                    Cuentas vencidas: <span className="font-bold text-red-600">{cuentasVencidas}</span>
                  </div>
                  <div className="text-gray-600">
                    Total pendiente: <span className="font-bold text-gray-900">{formatCurrency(totalPendiente)}</span>
                  </div>
                </div>
              </div>

              {proveedorCuentas.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No hay cuentas por pagar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proveedorCuentas.map((cuenta) => (
                    <div key={cuenta.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          {cuenta.referencia_compra && (
                            <p className="font-semibold text-gray-900">
                              Ref: {cuenta.referencia_compra}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            Compra: {formatDate(cuenta.fecha_compra)}
                          </p>
                        </div>
                        {getEstatusBadge(cuenta.estatus)}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                        <div>
                          <p className="text-xs text-gray-600">Monto Total</p>
                          <p className="font-semibold">{formatCurrency(cuenta.monto_total)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Pagado</p>
                          <p className="font-semibold text-green-600">{formatCurrency(cuenta.monto_pagado)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Saldo</p>
                          <p className="font-semibold text-red-600">{formatCurrency(cuenta.saldo_pendiente)}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className={`${
                          cuenta.estatus === 'vencido' ? 'text-red-600 font-semibold' : 'text-gray-600'
                        }`}>
                          Vencimiento: {formatDate(cuenta.fecha_vencimiento)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Estado de Cuenta */}
          {activeTab === 'estado' && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700">Total Comprado</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(totalComprado)}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700">Total Pendiente</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {formatCurrency(totalPendiente)}
                      </p>
                    </div>
                    <Receipt className="w-8 h-8 text-orange-400" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">Total Pagado</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatCurrency(totalComprado - totalPendiente)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Alertas */}
              {cuentasVencidas > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Cuentas Vencidas</p>
                    <p className="text-sm text-red-700">
                      Hay {cuentasVencidas} cuenta(s) vencida(s) que requieren atención inmediata
                    </p>
                  </div>
                </div>
              )}

              {creditoDisponible < 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Límite de Crédito Excedido</p>
                    <p className="text-sm text-yellow-700">
                      El saldo pendiente excede el límite de crédito en {formatCurrency(Math.abs(creditoDisponible))}
                    </p>
                  </div>
                </div>
              )}

              {/* Métricas adicionales */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Métricas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de Compras</p>
                    <p className="text-xl font-bold text-gray-900">{proveedorCompras.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Cuentas</p>
                    <p className="text-xl font-bold text-gray-900">{proveedorCuentas.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Promedio por Compra</p>
                    <p className="text-xl font-bold text-gray-900">
                      {proveedorCompras.length > 0
                        ? formatCurrency(totalComprado / proveedorCompras.length)
                        : formatCurrency(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Días de Crédito Promedio</p>
                    <p className="text-xl font-bold text-gray-900">
                      {proveedor.dias_credito_default || 30} días
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
