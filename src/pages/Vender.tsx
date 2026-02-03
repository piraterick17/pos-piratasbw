import { ClienteSelector } from '../components/ClienteSelector';
import { SalsaSelector } from '../components/SalsaSelector';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DiscountModal } from '../components/DiscountModal';
import { OrderSummaryModal } from '../components/OrderSummaryModal';
import { CobroModal } from '../components/CobroModal';
import { TicketModal } from '../components/TicketModal';
import { SugerenciaComplementosModal } from '../components/SugerenciaComplementosModal';
import { TiempoEntregaModal } from '../components/TiempoEntregaModal';
import { useVender } from '../hooks/useVender';
import { PedidoActivo } from '../components/pos/PedidoActivo';
import { ProductCatalog } from '../components/pos/ProductCatalog';
import { FloatingCartButton } from '../components/pos/FloatingCartButton';
import { useCartStore } from '../lib/store/cartStore';

export function Vender() {
  const vender = useVender();

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row lg:gap-8">
        {/* --- Columna Izquierda: Catálogo de Productos --- */}
        <ProductCatalog
          productos={vender.productos}
          categorias={vender.categorias}
          isLoading={vender.productosLoading}
          searchTerm={vender.searchTerm}
          onSearchChange={vender.setSearchTerm}
          selectedCategory={vender.selectedCategory}
          onCategoryChange={vender.setSelectedCategory}
          isSimplifiedView={vender.isSimplifiedView}
          onToggleView={vender.setIsSimplifiedView}
          onAddToCarrito={vender.handleAddToCarrito}
          carrito={vender.carrito}
          editingOrderId={vender.editingOrderId}
          onCancelEdition={vender.handleCancelEdition}
        />

        {/* --- Columna Derecha: Pedido Activo (Solo visible en escritorio) --- */}
        <div className="hidden lg:block lg:flex-1 lg:max-w-md border-l border-gray-100 bg-white">
          <div className="sticky top-0 h-screen py-4 px-4 overflow-hidden">
            <PedidoActivo
              onOpenClienteSelector={() => vender.setIsClienteSelectorOpen(true)}
              onEditItem={vender.handleEditCartItem}
              onSaveOrder={vender.handleSaveOrder}
              onCharge={vender.handleCharge}
              onClearCart={vender.handleClearCart}
              onOpenDiscountModal={() => vender.setIsDiscountModalOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Botón flotante para móvil */}
      <FloatingCartButton onClick={() => vender.setIsCartModalOpen(true)} />

      {/* Modal del carrito para móvil */}
      {vender.isCartModalOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => vender.setIsCartModalOpen(false)}>
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-[2.5rem] shadow-2xl h-[85dvh] flex flex-col overflow-hidden" style={{ zIndex: 50 }} onClick={e => e.stopPropagation()}>
            <PedidoActivo
              onClose={() => vender.setIsCartModalOpen(false)}
              onOpenClienteSelector={() => vender.setIsClienteSelectorOpen(true)}
              onEditItem={vender.handleEditCartItem}
              onSaveOrder={vender.handleSaveOrder}
              onCharge={vender.handleCharge}
              onClearCart={vender.handleClearCart}
              onOpenDiscountModal={() => vender.setIsDiscountModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Modales Compartidos */}
      <ClienteSelector
        isOpen={vender.isClienteSelectorOpen}
        onClose={() => vender.setIsClienteSelectorOpen(false)}
        clientes={vender.clientes}
        onClienteSelect={(cliente) => {
          vender.setClienteSeleccionado(cliente);
          vender.setIsClienteSelectorOpen(false);
        }}
      />

      <SalsaSelector
        isOpen={vender.isSalsaSelectorOpen}
        onClose={() => {
          vender.setIsSalsaSelectorOpen(false);
        }}
        producto={vender.selectedProductForSalsas}
        onConfirm={vender.handleConfirmSalsas}
        initialSelection={vender.editingCartItem?.salsas_seleccionadas || []}
      />

      <ConfirmationModal
        isOpen={false} // Mantener por compatibilidad visual si se necesita
        onClose={() => { }}
        onConfirm={() => { }}
        title="Confirmación"
        message="¿Estás seguro?"
      />

      <CobroModal
        isOpen={vender.isCobroModalOpen}
        onClose={() => vender.setIsCobroModalOpen(false)}
        pedido={vender.pedidoParaCobro}
        onFinalizar={vender.handleFinalizarVenta}
        isSubmitting={vender.isSubmitting}
        cliente={vender.clienteSeleccionado}
        tipoEntrega={vender.tiposEntrega.find(t => t.id === vender.tipoEntregaId)}
      />

      <SugerenciaComplementosModal
        isOpen={vender.isSugerenciaComplementosOpen}
        onClose={() => {
          vender.setIsSugerenciaComplementosOpen(false);
          vender.setAccionPendiente(null);
        }}
        onConfirmar={vender.handleConfirmarComplementos}
        faltaAcompanamiento={vender.metricasVenta.ofrecioAcompanamiento}
        faltaPostre={vender.metricasVenta.ofrecioPostre}
      />

      <TiempoEntregaModal
        isOpen={vender.isTiempoEntregaModalOpen}
        onClose={() => {
          vender.setIsTiempoEntregaModalOpen(false);
          vender.setAccionPendiente(null);
        }}
        onConfirmar={vender.handleConfirmarTiempoEntrega}
      />

      <DiscountModal
        isOpen={vender.isDiscountModalOpen}
        onClose={() => vender.setIsDiscountModalOpen(false)}
        subtotal={useCartStore.getState().getCarritoSubtotal()}
      />

      <OrderSummaryModal
        isOpen={vender.isOrderSummaryOpen}
        onClose={() => vender.setIsOrderSummaryOpen(false)}
        onConfirm={() => {
          vender.setIsOrderSummaryOpen(false);
          vender.handleSaveOrder();
        }}
        cliente={vender.clienteSeleccionado}
        tipoEntrega={vender.tiposEntrega.find(t => t.id === vender.tipoEntregaId)}
        items={vender.carrito}
        subtotal={useCartStore.getState().getCarritoSubtotal()}
        descuento={vender.descuento}
        descuentoTipo={vender.descuentoTipo}
        costoEnvio={vender.costoEnvio}
        direccion={vender.direccionEnvio}
        zonaEntrega={vender.zonasEntrega.find(z => z.id === vender.zonaEntregaId)}
        notasEntrega={vender.notasEntrega}
        notas={vender.notas}
      />

      <TicketModal
        isOpen={vender.isTicketModalOpen}
        onClose={() => {
          vender.setIsTicketModalOpen(false);
          vender.setPedidoCreado(null);
        }}
        pedido={vender.pedidoCreado}
      />
    </>
  );
}