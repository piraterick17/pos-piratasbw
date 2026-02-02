import React, { useEffect, useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils/formatters';
import { supabase } from '../../lib/supabase/client';

interface Props {
  cuenta: any;
  onClose: () => void;
}

export function DetallesPagosCuentaModal({ cuenta, onClose }: Props) {
  const [pagos, setPagos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPagos();
  }, [cuenta.id]);

  const fetchPagos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('finanzas_pagos_cxp')
        .select('*')
        .eq('cuenta_por_pagar_id', cuenta.id)
        .order('fecha_pago', { ascending: false });

      if (error) throw error;
      setPagos(data || []);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Detalles de Cuenta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Proveedor</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">{cuenta.proveedor?.nombre}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Referencia</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {cuenta.referencia_compra || `#${cuenta.id}`}
                </p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Monto Total</p>
                <p className="text-base sm:text-lg font-bold text-gray-900">{formatCurrency(cuenta.monto_total)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Saldo Pendiente</p>
                <p className="text-base sm:text-lg font-bold text-red-600">{formatCurrency(cuenta.saldo_pendiente)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Pagado</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{formatCurrency(cuenta.monto_pagado)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Fecha de Vencimiento</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{formatDate(cuenta.fecha_vencimiento)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Estatus</p>
                <div className="mt-1">{getEstatusBadge(cuenta.estatus)}</div>
              </div>
              {cuenta.notas && (
                <div className="sm:col-span-2">
                  <p className="text-xs sm:text-sm text-gray-600">Notas</p>
                  <p className="text-sm text-gray-900 mt-1">{cuenta.notas}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              Historial de Pagos
            </h3>

            {isLoading ? (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando pagos...</p>
              </div>
            ) : pagos.length === 0 ? (
              <div className="text-center p-6 sm:p-8 bg-gray-50 rounded-lg border border-gray-200">
                <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-gray-600">No hay pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {pagos.map((pago) => (
                  <div
                    key={pago.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          <span className="text-base sm:text-lg font-bold text-gray-900">
                            {formatCurrency(pago.monto_pagado)}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            {formatDate(pago.fecha_pago)}
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                            {pago.metodo_pago}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
