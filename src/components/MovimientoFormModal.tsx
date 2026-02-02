import React, { useState, useEffect } from 'react';
import { X, DollarSign, FileText, Save, User, Calendar, RefreshCw, Receipt, CreditCard } from 'lucide-react';
import { useFinanzasStore, MovimientoFinanciero } from '../lib/store/finanzasStore';
import { useProveedoresStore } from '../lib/store/proveedoresStore';

interface MovimientoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  movimiento?: MovimientoFinanciero | null;
  movimientoToEdit?: MovimientoFinanciero | null;
}

const METODOS_PAGO = [
  'Efectivo',
  'Transferencia',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Cheque',
  'Otro'
];

const FRECUENCIAS_RECURRENCIA = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
];

export function MovimientoFormModal({ isOpen, onClose, onSuccess, movimiento, movimientoToEdit }: MovimientoFormModalProps) {
  const { createMovimiento, updateMovimiento, categorias, fetchCategorias, isSubmitting } = useFinanzasStore();
  const { proveedores, fetchProveedores } = useProveedoresStore();
  const editingMovimiento = movimiento || movimientoToEdit;
  const isEditing = !!editingMovimiento;

  const [formData, setFormData] = useState<Omit<MovimientoFinanciero, 'id'>>({
    tipo: 'egreso',
    monto: 0,
    descripcion: '',
    estatus: 'pagado',
    fecha_movimiento: new Date().toISOString().split('T')[0],
  });

  const [esRecurrente, setEsRecurrente] = useState(false);
  const [recurrenciaData, setRecurrenciaData] = useState({
    frecuencia: 'mensual',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    dia_del_mes: new Date().getDate(),
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingMovimiento) {
        setFormData({
          tipo: editingMovimiento.tipo,
          monto: editingMovimiento.monto,
          descripcion: editingMovimiento.descripcion,
          estatus: editingMovimiento.estatus,
          categoria_id: editingMovimiento.categoria_id,
          proveedor_id: editingMovimiento.proveedor_id,
          metodo_pago: editingMovimiento.metodo_pago,
          referencia: editingMovimiento.referencia,
          fecha_movimiento: editingMovimiento.fecha_movimiento
            ? new Date(editingMovimiento.fecha_movimiento).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        });
      } else {
        setFormData({
          tipo: 'egreso',
          monto: 0,
          descripcion: '',
          estatus: 'pagado',
          metodo_pago: 'Efectivo',
          fecha_movimiento: new Date().toISOString().split('T')[0],
        });
      }
      setEsRecurrente(false);
      setRecurrenciaData({
        frecuencia: 'mensual',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        dia_del_mes: new Date().getDate(),
      });
      fetchCategorias();
      fetchProveedores();
    }
  }, [isOpen, editingMovimiento, isEditing, fetchCategorias, fetchProveedores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.monto <= 0 || !formData.descripcion) return;

    try {
      if (isEditing) {
        await updateMovimiento(editingMovimiento!.id!, formData);
      } else {
        await createMovimiento(formData, esRecurrente ? recurrenciaData : undefined);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      // El store maneja el toast de error
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
            {isEditing ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Información Básica
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Movimiento *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({...formData, tipo: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="egreso">Egreso (Gasto)</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado del Movimiento *
                  </label>
                  <select
                    value={formData.estatus}
                    onChange={e => setFormData({...formData, estatus: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción *
                  </label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={e => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Pago de renta, Compra de ingredientes..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monto || ''}
                      onChange={e => setFormData({...formData, monto: parseFloat(e.target.value) || 0})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha del Movimiento *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.fecha_movimiento}
                      onChange={e => setFormData({...formData, fecha_movimiento: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles del Pago */}
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                Detalles del Pago
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={formData.metodo_pago || ''}
                    onChange={e => setFormData({...formData, metodo_pago: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Seleccionar método...</option>
                    {METODOS_PAGO.map(metodo => (
                      <option key={metodo} value={metodo}>{metodo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia / Folio
                  </label>
                  <div className="relative">
                    <Receipt className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.referencia || ''}
                      onChange={e => setFormData({...formData, referencia: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: FAC-001, TRANSF-123..."
                    />
                  </div>
                </div>

                {formData.tipo === 'egreso' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proveedor
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <select
                          value={formData.proveedor_id || ''}
                          onChange={e => setFormData({...formData, proveedor_id: Number(e.target.value) || undefined})}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Sin proveedor</option>
                          {proveedores.map(prov => (
                            <option key={prov.id} value={prov.id}>
                              {prov.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Asocia este gasto con un proveedor específico
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Categoría del Gasto
                      </label>
                      <select
                        value={formData.categoria_id || ''}
                        onChange={e => setFormData({...formData, categoria_id: Number(e.target.value) || undefined})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pagos Recurrentes */}
            {!isEditing && formData.tipo === 'egreso' && (
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                    Pago Recurrente
                  </h3>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={esRecurrente}
                      onChange={e => setEsRecurrente(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Este es un pago recurrente
                    </span>
                  </label>
                </div>

                {esRecurrente && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia *
                      </label>
                      <select
                        value={recurrenciaData.frecuencia}
                        onChange={e => setRecurrenciaData({...recurrenciaData, frecuencia: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        required={esRecurrente}
                      >
                        {FRECUENCIAS_RECURRENCIA.map(freq => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </select>
                    </div>

                    {recurrenciaData.frecuencia === 'mensual' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Día del Mes
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={recurrenciaData.dia_del_mes}
                          onChange={e => setRecurrenciaData({...recurrenciaData, dia_del_mes: Number(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Día del mes en que se realizará el pago
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        value={recurrenciaData.fecha_inicio}
                        onChange={e => setRecurrenciaData({...recurrenciaData, fecha_inicio: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required={esRecurrente}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Fin (Opcional)
                      </label>
                      <input
                        type="date"
                        value={recurrenciaData.fecha_fin}
                        onChange={e => setRecurrenciaData({...recurrenciaData, fecha_fin: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        min={recurrenciaData.fecha_inicio}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Deja vacío si no tiene fecha de fin
                      </p>
                    </div>

                    <div className="md:col-span-2 bg-green-100 border border-green-300 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <strong>Nota:</strong> Se creará el primer movimiento hoy y se configurará una recurrencia
                        {recurrenciaData.frecuencia === 'mensual'
                          ? ` que se ejecutará el día ${recurrenciaData.dia_del_mes} de cada mes`
                          : ` con frecuencia ${FRECUENCIAS_RECURRENCIA.find(f => f.value === recurrenciaData.frecuencia)?.label.toLowerCase()}`
                        }
                        {recurrenciaData.fecha_fin
                          ? ` hasta el ${new Date(recurrenciaData.fecha_fin).toLocaleDateString()}.`
                          : ' sin fecha de finalización.'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : (esRecurrente ? 'Crear Recurrente' : 'Guardar'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
