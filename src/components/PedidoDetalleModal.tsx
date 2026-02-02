import React from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Clock, 
  CreditCard, 
  Package, 
  CheckCircle, 
  Truck, 
  Calendar, 
  Printer, 
  Info,
  Store
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils/formatters';

interface PedidoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
  onShowTicket?: () => void; // Opcional por si se usa en otro lado
}

export const PedidoDetalleModal: React.FC<PedidoDetalleModalProps> = ({ 
  isOpen, 
  onClose, 
  pedido, 
  onShowTicket 
}) => {
  if (!isOpen || !pedido) return null;

  // Helper para mostrar dirección formateada
  const renderDireccion = (dir: any) => {
    if (!dir) return 'Sin dirección registrada';
    if (typeof dir === 'string') return dir;
    return (
      <>
        <span className="block">{dir.calle || ''} #{dir.numero || ''}</span>
        {dir.colonia && <span className="block text-gray-500 text-xs">{dir.colonia}</span>}
        {dir.referencia && <span className="block text-gray-400 text-xs mt-1 italic">Ref: {dir.referencia}</span>}
      </>
    );
  };

  // Helper para items de la línea de tiempo
  const TimelineItem = ({ label, date, icon, colorClass }: any) => {
    if (!date) return null;
    return (
      <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${colorClass}`}>
            {icon}
          </div>
          <span className="text-sm text-gray-600">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {formatDate(date)}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between p-5 border-b bg-white z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">Pedido #{pedido.id}</h2>
              <span 
                className="px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wide shadow-sm"
                style={{ backgroundColor: pedido.estado_color || '#6B7280' }}
              >
                {pedido.estado_nombre || pedido.estado}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Creado el: {formatDate(pedido.insert_date)}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* --- BODY (Scrollable) --- */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMNA IZQUIERDA: Cliente y Entrega */}
            <div className="space-y-6">
              
              {/* 1. Detalle del Cliente */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                  <User className="w-4 h-4 text-indigo-600" /> Información del Cliente
                </h3>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {pedido.cliente_nombre ? pedido.cliente_nombre.charAt(0) : 'C'}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      {pedido.cliente_nombre || 'Cliente Final'}
                    </p>
                    {pedido.cliente_telefono && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {pedido.cliente_telefono}
                      </p>
                    )}
                    {!pedido.cliente_nombre && !pedido.cliente_telefono && (
                      <p className="text-sm text-gray-400 italic">Sin datos de contacto</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Detalle de Entrega / Servicio */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                  {pedido.tipo_entrega_nombre === 'A domicilio' 
                    ? <><Truck className="w-4 h-4 text-orange-600" /> Logística de Entrega</>
                    : <><Store className="w-4 h-4 text-green-600" /> Detalle de Servicio</>
                  }
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Tipo:</span>
                    <span className="font-semibold text-gray-900">{pedido.tipo_entrega_nombre || 'Para Llevar'}</span>
                  </div>

                  {pedido.tipo_entrega_nombre === 'A domicilio' ? (
                    <>
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <MapPin className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                           <p className="font-bold text-orange-800 mb-1">
                             {pedido.zona_entrega_id ? `Zona ${pedido.zona_entrega_id}` : 'Zona General'}
                           </p>
                           {renderDireccion(pedido.direccion_envio)}
                        </div>
                      </div>
                      
                      {/* Horas logísticas de reparto */}
                      <div className="space-y-1 mt-2">
                         <div className="flex justify-between text-xs text-gray-500">
                           <span>Salida a Ruta:</span>
                           <span className="font-medium text-gray-700">
                             {pedido.fecha_en_ruta ? formatDate(pedido.fecha_en_ruta) : '--:--'}
                           </span>
                         </div>
                         <div className="flex justify-between text-xs text-gray-500">
                           <span>Entrega Final:</span>
                           <span className="font-medium text-gray-700">
                             {pedido.fecha_entregado ? formatDate(pedido.fecha_entregado) : '--:--'}
                           </span>
                         </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-800">
                      <p>El pedido se entrega directamente en el local.</p>
                      {pedido.notas_entrega && (
                        <p className="mt-2 text-xs italic border-t border-green-200 pt-2">
                          Nota: {pedido.notas_entrega}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: Tiempos, Pagos y Productos */}
            <div className="space-y-6">
              
              {/* 3. Línea de Tiempo del Pedido */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Cronología
                </h3>
                <div className="space-y-1">
                  <TimelineItem 
                    label="Pedido Recibido" 
                    date={pedido.insert_date} 
                    icon={<Calendar className="w-3 h-3 text-gray-600" />} 
                    colorClass="bg-gray-100"
                  />
                  <TimelineItem 
                    label="Listo para Entrega" 
                    date={pedido.fecha_listo_para_entrega} 
                    icon={<CheckCircle className="w-3 h-3 text-yellow-600" />} 
                    colorClass="bg-yellow-100"
                  />
                  <TimelineItem 
                    label="Entregado / Finalizado" 
                    date={pedido.fecha_entregado || pedido.fecha_finalizacion} 
                    icon={<CheckCircle className="w-3 h-3 text-green-600" />} 
                    colorClass="bg-green-100"
                  />
                  {/* Último pago registrado */}
                  {pedido.pagos && pedido.pagos.length > 0 && (
                    <TimelineItem 
                      label="Último Pago" 
                      date={pedido.pagos[0].fecha_pago} 
                      icon={<CreditCard className="w-3 h-3 text-purple-600" />} 
                      colorClass="bg-purple-100"
                    />
                  )}
                </div>
              </div>

              {/* 4. Pagos Registrados */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Pagos Registrados
                </h3>
                {pedido.pagos && pedido.pagos.length > 0 ? (
                  <div className="space-y-2">
                    {pedido.pagos.map((pago: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div>
                          <p className="text-sm font-bold text-emerald-900 capitalize">
                            {pago.metodo_pago?.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-emerald-600">
                            {pago.fecha_pago ? formatDate(pago.fecha_pago) : '-'}
                          </p>
                        </div>
                        <span className="text-base font-bold text-emerald-700">
                          {formatCurrency(pago.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">No hay pagos registrados</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN INFERIOR: Productos y Totales */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 uppercase text-sm tracking-wider">
                  <Package className="w-4 h-4" /> Productos ({pedido.detalles?.length || 0})
                </h3>
             </div>
             
             <div className="divide-y divide-gray-100">
                {pedido.detalles?.map((detalle: any, index: number) => (
                  <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center font-bold text-sm border border-gray-200">
                        {detalle.cantidad}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{detalle.producto?.nombre || 'Producto sin nombre'}</p>
                        {detalle.salsas_seleccionadas && (
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1">
                             {Array.isArray(detalle.salsas_seleccionadas)
                                ? detalle.salsas_seleccionadas.map((s:any, i:number) => (
                                    <span key={i} className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100">
                                      {s.nombre || s}
                                      {Number(s.precio) > 0 && (
                                        <span className="font-semibold"> ({formatCurrency(s.precio)})</span>
                                      )}
                                    </span>
                                  ))
                                : <span className="text-gray-400">{String(detalle.salsas_seleccionadas)}</span>
                             }
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(detalle.subtotal)}
                    </span>
                  </div>
                ))}
             </div>

             {/* Footer Financiero */}
             <div className="bg-gray-50 p-5 border-t">
               <div className="flex flex-col gap-2 max-w-xs ml-auto">
                 <div className="flex justify-between text-sm text-gray-600">
                   <span>Subtotal</span>
                   <span>{formatCurrency(pedido.subtotal || 0)}</span>
                 </div>
                 {(pedido.descuentos || 0) > 0 && (
                   <div className="flex justify-between text-sm text-red-600 font-medium">
                     <span>Descuentos</span>
                     <span>-{formatCurrency(pedido.descuentos)}</span>
                   </div>
                 )}
                 {(pedido.costo_envio || 0) > 0 && (
                   <div className="flex justify-between text-sm text-blue-600 font-medium">
                     <span>Envío</span>
                     <span>+{formatCurrency(pedido.costo_envio)}</span>
                   </div>
                 )}
                 <div className="border-t border-gray-300 my-1"></div>
                 <div className="flex justify-between text-xl font-bold text-gray-900">
                   <span>Total</span>
                   <span>{formatCurrency(pedido.total || 0)}</span>
                 </div>
               </div>
             </div>
          </div>

          {/* Notas Generales */}
          {pedido.notas && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-yellow-800 mb-1">Notas del Pedido:</h4>
                <p className="text-sm text-yellow-900 leading-relaxed">{pedido.notas}</p>
              </div>
            </div>
          )}

        </div>

        {/* --- FOOTER DE ACCIONES --- */}
        <div className="p-5 border-t bg-white flex justify-end gap-3 z-10">
          {onShowTicket && (
            <button
              onClick={onShowTicket}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};