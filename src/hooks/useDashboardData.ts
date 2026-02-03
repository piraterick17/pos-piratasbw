import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/client';
import { getLocalDateStr } from '../lib/utils/time';

export interface DashboardMetrics {
    totalPedidos: number;
    pedidosDomicilio: number;
    totalVentas: number;
    ticketPromedio: number;
    topProductos: Array<{ nombre: string; cantidad: number; total: number; categoria?: string }>;
    topUbicaciones: Array<{ zona: string; cantidad: number }>;
    ventasPorDia: Array<{ fecha: string; ventas: number; pedidos: number }>;
    topSalsas: Array<{ nombre: string; cantidad: number }>;
    topClientes: Array<{ nombre: string; total: number; pedidos: number; ultimaCompra?: string }>;
    rawData: any[];
}

interface UseDashboardDataOptions {
    breakfastOnly?: boolean;
    filterCategoria?: 'todos' | 'solo_desayunos' | 'excluir_desayunos';
    desayunosCategoryId?: number;
    includeCancelled?: boolean;
}

export function useDashboardData(startDate: string, endDate: string, options: UseDashboardDataOptions = {}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const [data, setData] = useState<DashboardMetrics>({
        totalPedidos: 0,
        pedidosDomicilio: 0,
        totalVentas: 0,
        ticketPromedio: 0,
        topProductos: [],
        topUbicaciones: [],
        ventasPorDia: [],
        topSalsas: [],
        topClientes: [],
        rawData: []
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Obtener pedidos desde la vista robusta
            const query = supabase
                .from('pedidos_vista')
                .select(`
                    id,
                    total,
                    tipo_entrega_nombre,
                    zona_entrega_id,
                    insert_date,
                    cliente_nombre,
                    estado_nombre,
                    metodo_pago,
                    costo_envio,
                    detalles_pedido (
                        cantidad,
                        precio_unitario,
                        producto_id,
                        productos (nombre, categoria_id, categorias(nombre)),
                        salsas_seleccionadas
                    )
                `)
                .gte('insert_date', startDate)
                .lte('insert_date', endDate)
                .is('deleted_at', null)
                .order('insert_date', { ascending: true });

            // Filtrado por estado
            if (!options.includeCancelled) {
                query.in('estado_nombre', ['Completado', 'En Reparto']);
            } else {
                query.in('estado_nombre', ['Completado', 'En Reparto', 'Cancelado']);
            }

            const { data: pedidos, error: pedidosError } = await query;
            if (pedidosError) throw pedidosError;

            // 2. Filtrado por Horario (Turno Matutino 8am-12pm México)
            const hourlyFormatter = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                hour12: false,
                timeZone: 'America/Mexico_City'
            });

            let filteredPedidos = pedidos || [];

            if (options.breakfastOnly) {
                filteredPedidos = filteredPedidos.filter(pedido => {
                    if (!pedido.insert_date) return false;
                    const hora = parseInt(hourlyFormatter.format(new Date(pedido.insert_date)));
                    return hora >= 8 && hora < 12;
                });
            }

            // 3. Filtrado por Categoría
            if (options.filterCategoria && options.desayunosCategoryId) {
                filteredPedidos = filteredPedidos.filter(pedido => {
                    const detalles = (pedido.detalles_pedido as any[]) || [];
                    const hasDesayuno = detalles.some(d => d.productos?.categoria_id === options.desayunosCategoryId);

                    if (options.filterCategoria === 'solo_desayunos') return hasDesayuno;
                    if (options.filterCategoria === 'excluir_desayunos') return !hasDesayuno;
                    return true;
                });
            }

            // 4. Cálculos de Métricas
            const operationalPedidos = filteredPedidos.filter(p => !['Cancelado', 'Anulado'].includes(p.estado_nombre || ''));

            const totalPedidos = operationalPedidos.length;
            const pedidosDomicilio = operationalPedidos.filter(p => p.tipo_entrega_nombre === 'A domicilio').length;
            const totalVentas = operationalPedidos.reduce((sum, p) => sum + (p.total || 0), 0);
            const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

            // Procesamiento de Top Listas
            const productosMap = new Map<string, { cantidad: number; total: number; categoria: string }>();
            const clientesMap = new Map<string, { total: number; pedidos: number; ultimaCompra: string }>();
            const salsasMap = new Map<string, number>();
            const ventasPorDiaMap = new Map<string, { ventas: number; pedidos: number }>();

            filteredPedidos.forEach(pedido => {
                const isCancelled = ['Cancelado', 'Anulado'].includes(pedido.estado_nombre || '');

                // Clientes
                const nombreCliente = pedido.cliente_nombre || 'Cliente Final';
                const clientStats = clientesMap.get(nombreCliente) || { total: 0, pedidos: 0, ultimaCompra: '' };
                if (!isCancelled) {
                    clientesMap.set(nombreCliente, {
                        total: clientStats.total + (pedido.total || 0),
                        pedidos: clientStats.pedidos + 1,
                        ultimaCompra: pedido.insert_date > clientStats.ultimaCompra ? pedido.insert_date : clientStats.ultimaCompra
                    });
                }

                // Ventas por día
                const fechaLocal = getLocalDateStr(pedido.insert_date);
                const dayStats = ventasPorDiaMap.get(fechaLocal) || { ventas: 0, pedidos: 0 };
                if (!isCancelled) {
                    ventasPorDiaMap.set(fechaLocal, {
                        ventas: dayStats.ventas + (pedido.total || 0),
                        pedidos: dayStats.pedidos + 1
                    });
                }

                // Detalles (Productos y Salsas)
                if (!isCancelled) {
                    (pedido.detalles_pedido as any[])?.forEach(item => {
                        // Productos
                        const nombreProd = item.productos?.nombre || 'Producto desconocido';
                        const catProd = item.productos?.categorias?.nombre || 'General';
                        const prodStats = productosMap.get(nombreProd) || { cantidad: 0, total: 0, categoria: catProd };
                        productosMap.set(nombreProd, {
                            cantidad: prodStats.cantidad + item.cantidad,
                            total: prodStats.total + (item.cantidad * item.precio_unitario),
                            categoria: catProd
                        });

                        // Salsas
                        if (item.salsas_seleccionadas && Array.isArray(item.salsas_seleccionadas)) {
                            item.salsas_seleccionadas.forEach((s: any) => {
                                const sNom = typeof s === 'string' ? s : s.nombre;
                                salsasMap.set(sNom, (salsasMap.get(sNom) || 0) + 1);
                            });
                        }
                    });
                }
            });

            // 5. Formatear resultados finales
            const topProductos = Array.from(productosMap.entries())
                .map(([nombre, stats]) => ({ nombre, ...stats }))
                .sort((a, b) => b.cantidad - a.cantidad);

            const topClientes = Array.from(clientesMap.entries())
                .map(([nombre, stats]) => ({ nombre, ...stats }))
                .sort((a, b) => b.total - a.total);

            const topSalsas = Array.from(salsasMap.entries())
                .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 10);

            const ventasPorDia = Array.from(ventasPorDiaMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([fecha, stats]) => ({
                    fecha: new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
                    ...stats
                }));

            // Zonas de Entrega
            let finalTopUbicaciones: any[] = [];
            if (totalPedidos > 0) {
                const { data: zonas } = await supabase.from('zonas_entrega').select('id, nombre');
                const zonasLookup = new Map(zonas?.map(z => [z.id, z.nombre]) || []);
                const zonasDistribucion = new Map<string, number>();

                operationalPedidos.forEach(p => {
                    if (p.tipo_entrega_nombre === 'A domicilio' && p.zona_entrega_id) {
                        const zNom = zonasLookup.get(p.zona_entrega_id);
                        if (zNom) zonasDistribucion.set(zNom, (zonasDistribucion.get(zNom) || 0) + 1);
                    }
                });

                finalTopUbicaciones = Array.from(zonasDistribucion.entries())
                    .map(([zona, cantidad]) => ({ zona, cantidad }))
                    .sort((a, b) => b.cantidad - a.cantidad);
            }

            setData({
                totalPedidos,
                pedidosDomicilio,
                totalVentas,
                ticketPromedio,
                topProductos,
                topUbicaciones: finalTopUbicaciones,
                ventasPorDia,
                topSalsas,
                topClientes,
                rawData: filteredPedidos
            });

        } catch (err) {
            console.error('Error in useDashboardData:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, options.breakfastOnly, options.filterCategoria, options.desayunosCategoryId, options.includeCancelled]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
