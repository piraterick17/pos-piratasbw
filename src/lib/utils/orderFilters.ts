import { Pedido } from '../store/pedidosStore';

export type ModoFiltroCategorias = 'todos' | 'solo_desayunos' | 'excluir_desayunos';

export interface FiltroCategoriasConfig {
  modo: ModoFiltroCategorias;
  categoriaDesayunosId?: number;
}

export function filterPedidosByCategoria(
  pedidos: Pedido[],
  modo: ModoFiltroCategorias,
  categoriaDesayunosId: number = 54
): Pedido[] {
  if (modo === 'todos') {
    return pedidos;
  }

  return pedidos.filter(pedido => {
    if (!pedido.detalles || pedido.detalles.length === 0) {
      return modo === 'excluir_desayunos';
    }

    const esDesayuno = pedido.detalles.some(detalle => {
      if (!detalle.producto) return false;
      return detalle.producto.categoria_id === categoriaDesayunosId;
    });

    return modo === 'solo_desayunos' ? esDesayuno : !esDesayuno;
  });
}

export function filterProductosByCategoria<T extends { categoria_nombre?: string | null }>(
  productos: T[],
  modo: ModoFiltroCategorias,
  categoriaDesayunosNombre: string = 'Desayunos'
): T[] {
  if (modo === 'todos') {
    return productos;
  }

  return productos.filter(producto => {
    const esDesayuno = producto.categoria_nombre === categoriaDesayunosNombre;
    return modo === 'solo_desayunos' ? esDesayuno : !esDesayuno;
  });
}
