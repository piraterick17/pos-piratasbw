import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils/formatters';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
}

export function TicketModal({ isOpen, onClose, pedido }: TicketModalProps) {
  if (!isOpen || !pedido) return null;

  const totalPagado = pedido.pagos?.reduce((sum: number, pago: any) => sum + (pago.monto || 0), 0) || 0;
  const saldoAPagar = (pedido.total || 0) - totalPagado;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Implementar descarga de PDF aquí
    // Por ahora, solo mostramos un mensaje
    alert('Función de descarga PDF en desarrollo');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Ticket de Venta</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket Content */}
        <div className="p-6 printable-area" id="ticket-content">
          {/* === INICIO TICKET CLIENTE === */}
          <div className="text-center mb-3">
            <h1 className="text-lg font-bold text-gray-900">LOS PIRATAS B&W</h1>
            <p className="text-xs text-gray-600">Burgers & Wings</p>
            <p className="text-xs text-gray-600">Tel: (123) 456-7890</p>
            <p className="text-xs text-gray-500">================================</p>
          </div>
          
          <div className="text-xs space-y-1 mb-3">
            <div className="flex justify-between">
              <span><strong>Ticket:</strong></span>
              <span>#{pedido.id}</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Fecha:</strong></span>
              <span>{formatDate(pedido.insert_date || new Date())}</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Cliente:</strong></span>
              <span>{pedido.cliente_nombre || 'Público en General'}</span>
            </div>
            <div className="flex justify-between">
              <span><strong>Tipo de Entrega:</strong></span>
              <span>{pedido.tipo_entrega_nombre || 'N/A'}</span>
            </div>
            {pedido.metodo_pago && (
              <div className="flex justify-between">
                <span><strong>Método de Pago:</strong></span>
                <span>{pedido.metodo_pago.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          <hr className="my-2 border-dashed border-gray-400" />

          {/* Productos */}
          <div className="mb-3">
            <h3 className="text-xs font-bold text-gray-900 mb-2">PRODUCTOS</h3>
            {pedido.detalles?.map((detalle: any, index: number) => {
              const nombreProducto = detalle.producto?.nombre || 'Producto';
              
              // --- CÁLCULO VISUAL CORREGIDO ---
              // Calculamos el costo total de los extras seleccionados
              const costoExtras = (detalle.salsas_seleccionadas || []).reduce((acc: number, s: any) => acc + (s.precio || 0), 0);
              
              // El precio unitario que viene de BD YA INCLUYE los extras.
              // Para mostrarlo desglosado correctamente (Base + Extras), restamos los extras al total.
              const precioUnitarioTotal = detalle.precio_unitario || 0;
              const precioBaseVisual = precioUnitarioTotal - costoExtras;

              const tieneExtras = detalle.salsas_seleccionadas && detalle.salsas_seleccionadas.length > 0;

              return (
                <div key={index} className="text-xs mb-1.5">
                  <div className="flex justify-between font-medium">
                    {/* Aquí mostramos el subtotal completo (Precio Unitario Total * Cantidad) */}
                    <div className="flex-1">{detalle.cantidad}x {nombreProducto}</div>
                    <div className="ml-2">{formatCurrency(detalle.subtotal)}</div>
                  </div>

                  {/* Lógica de visualización de precios */}
                  {tieneExtras ? (
                    <div className="text-gray-600 text-xs pl-2">
                       {/* Mostramos: Base ($85) + Extras ($5) = $90 c/u */}
                       {/* Usamos Math.max(0, ...) por seguridad para evitar negativos visuales */}
                      Base: {formatCurrency(Math.max(0, precioBaseVisual))} + Extras: {formatCurrency(costoExtras)} = {formatCurrency(precioUnitarioTotal)} c/u
                    </div>
                  ) : (
                    <div className="text-gray-600 text-xs pl-2">
                      @ {formatCurrency(precioUnitarioTotal)} c/u
                    </div>
                  )}

                  {tieneExtras && (
                    <div className="text-gray-600 text-xs pl-2 mt-0.5">
                      {detalle.salsas_seleccionadas.map((salsa: any, idx: number) => (
                        <span key={idx}>
                          + {salsa.nombre}
                          {Number(salsa.precio) > 0 && (
                            <span className="font-semibold"> ({formatCurrency(salsa.precio)})</span>
                          )}
                          {idx < detalle.salsas_seleccionadas.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="border-b border-dotted border-gray-300 my-1"></div>
                </div>
              );
            })}
          </div>

          <hr className="my-2 border-dashed border-gray-400" />

          {/* Totales */}
          <div className="text-xs space-y-0.5 mb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(pedido.subtotal || 0)}</span>
            </div>
            
            {(pedido.descuentos || 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuentos:</span>
                <span>-{formatCurrency(pedido.descuentos)}</span>
              </div>
            )}
            
            {(pedido.impuestos || 0) > 0 && (
              <div className="flex justify-between">
                <span>Impuestos:</span>
                <span>{formatCurrency(pedido.impuestos)}</span>
              </div>
            )}

            {pedido.tipo_entrega_nombre?.toLowerCase().includes('domicilio') && pedido.costo_envio !== undefined && pedido.costo_envio !== null && (
              <div className="flex justify-between">
                <span>Costo de Envío:</span>
                {pedido.costo_envio > 0 ? (
                  <span>{formatCurrency(pedido.costo_envio)}</span>
                ) : (
                  <span className="font-bold text-green-600">GRATIS</span>
                )}
              </div>
            )}
            
            <hr className="my-1.5 border-double border-2 border-gray-800" />

            <div className="flex justify-between font-bold text-base">
              <span>TOTAL:</span>
              <span>{formatCurrency(pedido.total || 0)}</span>
            </div>
            <hr className="my-1.5 border-double border-2 border-gray-800" />

            {pedido.tipo_entrega_nombre?.toLowerCase().includes('domicilio') && pedido.costo_envio === 0 && (
              <div className="text-center font-bold text-green-600 pt-1 text-xs">
                ¡ENVÍO GRATIS!
              </div>
            )}
          </div>

          {pedido.notas && (
            <>
              <hr className="my-2 border-dashed border-gray-400" />
              <div className="mb-2">
                <p className="text-xs font-bold text-gray-900">NOTAS:</p>
                <p className="text-xs text-gray-700">{pedido.notas}</p>
              </div>
            </>
          )}

          {/* Footer del ticket cliente */}
          <div className="text-center text-xs text-gray-600 mt-3 border-t border-gray-400 pt-2">
            <p className="font-bold">¡GRACIAS POR SU COMPRA!</p>
            <p className="text-xs">Conserve este ticket</p>
            <p className="text-xs mt-1">================================</p>
          </div>
          {/* === FIN TICKET CLIENTE === */}

          {/* === INICIO TALÓN PARA REPARTIDOR (si es a domicilio) === */}
          {pedido.tipo_entrega_nombre === 'A domicilio' && (
            <>
              <div className="border-t-2 border-dashed border-gray-800 my-4"></div>
              <div className="text-left">
                <div className="text-center mb-2">
                  <p className="text-sm font-bold text-gray-900">[ PARA REPARTIDOR ]</p>
                  <p className="text-xs text-gray-600">================================</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="border border-gray-800 p-2 text-center">
                    <p className="font-bold text-lg">PEDIDO #{pedido.id}</p>
                  </div>

                  <div className="border-b border-dotted border-gray-400 pb-1">
                    <p><strong>Cliente:</strong> {pedido.cliente_nombre || 'Sin nombre'}</p>
                    {pedido.cliente_telefono && (
                      <p><strong>Tel:</strong> {pedido.cliente_telefono}</p>
                    )}
                  </div>
                  
                  {pedido.direccion_envio && (
                    <div className="border border-gray-800 p-2">
                      <p className="font-bold text-xs mb-0.5">DIRECCIÓN:</p>
                      <p className="text-xs">
                        {pedido.direccion_envio.calle}
                        {pedido.direccion_envio.ciudad && `, ${pedido.direccion_envio.ciudad}`}
                      </p>
                      {pedido.direccion_envio.referencias && (
                        <p className="text-xs mt-0.5">
                          <strong>Ref:</strong> {pedido.direccion_envio.referencias}
                        </p>
                      )}
                    </div>
                  )}

                  {pedido.notas_entrega && (
                    <div className="border border-gray-800 p-2">
                      <p className="font-bold text-xs mb-0.5">NOTAS:</p>
                      <p className="text-xs">{pedido.notas_entrega}</p>
                    </div>
                  )}

                  {/* Productos para el repartidor */}
                  <div className="border border-gray-400 p-2">
                    <p className="font-bold text-xs mb-1">PRODUCTOS:</p>
                    {pedido.detalles?.map((detalle: any, index: number) => (
                      <div key={index} className="text-xs">
                        • {detalle.cantidad}x {detalle.producto?.nombre || 'Producto'}
                      </div>
                    ))}
                  </div>

                  {/* Información de cobro */}
                  {saldoAPagar > 0 ? (
                    <div className="border-2 border-gray-900 p-2 text-center">
                      <p className="font-bold text-sm">*** COBRAR ***</p>
                      <p className="font-bold text-2xl my-1">
                        {formatCurrency(saldoAPagar)}
                      </p>
                      <p className="text-xs">
                        Total: {formatCurrency(pedido.total)}
                      </p>
                      <p className="text-xs">
                        Pagado: {formatCurrency(totalPagado)}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-800 p-2 text-center">
                      <p className="font-bold text-sm">PEDIDO PAGADO</p>
                      <p className="text-xs">No cobrar - Solo entregar</p>
                    </div>
                  )}

                  {/* Total para referencia del repartidor */}
                  <div className="border-t-2 border-gray-800 pt-1.5 mt-1.5">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(pedido.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          {/* === FIN TALÓN PARA REPARTIDOR === */}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}