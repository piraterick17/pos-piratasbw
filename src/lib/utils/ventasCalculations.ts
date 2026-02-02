import { getLocalDateStr } from './time';

interface VentasTotalesResult {
  totalVentas: number;
  totalPedidos: number;
  desglosePorMetodoPago: { metodo: string; cantidad: number; monto: number }[];
  desglosePorCategoria: { nombre: string; cantidad: number; total: number; pedidos: number }[];
  desglosePorDia: { fecha: string; ventas: number; pedidos: number }[];
}

interface Options {
  estados?: string[];
}

export const calculateVentasTotales = (pedidos: any[], options: Options = {}): VentasTotalesResult => {
  const { estados = ['Completado', 'En Reparto'] } = options;

  // 1. Filtrar pedidos válidos (status correcto y no borrados)
  const pedidosValidos = pedidos.filter(p => {
    const estadoValido = estados.includes(p.estado_nombre || '');
    const noBorrado = !p.deleted_at;
    return estadoValido && noBorrado;
  });

  // Totales Generales
  // NOTA: Usamos p.total para incluir envíos, impuestos y descuentos, 
  // asegurando coincidencia con Transacciones (Flujo de Caja)
  const totalVentas = pedidosValidos.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPedidos = pedidosValidos.length;

  // 2. Desglose por Método de Pago
  const metodoMap = new Map<string, { cantidad: number; monto: number }>();
  
  pedidosValidos.forEach(p => {
    // Intentar obtener método del pedido, o del primer pago registrado, o 'otros'
    let metodo = p.metodo_pago;
    if (!metodo && p.pagos && p.pagos.length > 0) {
      metodo = p.pagos[0].metodo_pago;
    }
    const key = metodo || 'otros';

    const current = metodoMap.get(key) || { cantidad: 0, monto: 0 };
    metodoMap.set(key, {
      cantidad: current.cantidad + 1,
      monto: current.monto + (p.total || 0)
    });
  });

  const desglosePorMetodoPago = Array.from(metodoMap.entries()).map(([metodo, datos]) => ({
    metodo,
    ...datos
  }));

  // 3. Desglose por Categoría
  // NOTA: Este desglose suma items individuales. La suma total de esto NO coincidirá 
  // con totalVentas si hay costos de envío, ya que el envío no tiene categoría.
  const catMap = new Map<string, { cantidad: number; total: number; pedidosSet: Set<number> }>();

  pedidosValidos.forEach(p => {
    if (p.detalles) {
      p.detalles.forEach((d: any) => {
        const catNombre = d.producto?.categoria?.nombre || 'Sin Categoría';
        
        const current = catMap.get(catNombre) || { cantidad: 0, total: 0, pedidosSet: new Set() };
        
        current.cantidad += d.cantidad || 0;
        current.total += d.subtotal || 0;
        current.pedidosSet.add(p.id); 
        
        catMap.set(catNombre, current);
      });
    }
  });

  const desglosePorCategoria = Array.from(catMap.entries())
    .map(([nombre, datos]) => ({
      nombre,
      cantidad: datos.cantidad,
      total: datos.total,
      pedidos: datos.pedidosSet.size
    }))
    .sort((a, b) => b.total - a.total);

  // 4. Desglose por Día (CORRECCIÓN TIMEZONE)
  const diaMap = new Map<string, { ventas: number; pedidos: number }>();

  pedidosValidos.forEach(p => {
    if (!p.insert_date) return;

    // [FIX CRITICO] Usamos getLocalDateStr para obtener la fecha en Hora México.
    // Esto evita que una venta a las 10 PM del día 11 se cuente como día 12 (UTC).
    const fechaKey = getLocalDateStr(p.insert_date); 

    const current = diaMap.get(fechaKey) || { ventas: 0, pedidos: 0 };
    diaMap.set(fechaKey, {
      ventas: current.ventas + (p.total || 0),
      pedidos: current.pedidos + 1
    });
  });

  const desglosePorDia = Array.from(diaMap.entries())
    .map(([fecha, datos]) => ({
      fecha,
      ...datos
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    totalVentas,
    totalPedidos,
    desglosePorMetodoPago,
    desglosePorCategoria,
    desglosePorDia
  };
};

export interface ProductoVendido {
  productoId: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  total: number;
  pedidos: number;
}

export const calculateProductosVendidos = (pedidos: any[], options: Options = {}): ProductoVendido[] => {
  const { estados = ['Completado', 'En Reparto'] } = options;

  const pedidosValidos = pedidos.filter(p => {
    const estadoValido = estados.includes(p.estado_nombre || '');
    const noBorrado = !p.deleted_at;
    return estadoValido && noBorrado;
  });

  const productosMap = new Map<number, {
    nombre: string;
    categoria: string;
    cantidad: number;
    total: number;
    pedidosSet: Set<number>;
  }>();

  pedidosValidos.forEach(p => {
    if (p.detalles) {
      p.detalles.forEach((d: any) => {
        const productoId = d.producto_id;
        const nombreProducto = d.producto?.nombre || `Producto ${productoId}`;
        const categoriaProducto = d.producto?.categoria?.nombre || 'Sin Categoría';

        const current = productosMap.get(productoId) || {
          nombre: nombreProducto,
          categoria: categoriaProducto,
          cantidad: 0,
          total: 0,
          pedidosSet: new Set()
        };

        current.cantidad += d.cantidad || 0;
        current.total += d.subtotal || 0;
        current.pedidosSet.add(p.id);

        productosMap.set(productoId, current);
      });
    }
  });

  return Array.from(productosMap.entries())
    .map(([productoId, datos]) => ({
      productoId,
      nombre: datos.nombre,
      categoria: datos.categoria,
      cantidad: datos.cantidad,
      total: datos.total,
      pedidos: datos.pedidosSet.size
    }))
    .sort((a, b) => b.total - a.total);
};