import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import { Trophy, TrendingUp, Package } from 'lucide-react';
import { formatCurrency } from '../../lib/utils/formatters';

interface TopProduct {
    producto_id: number;
    producto_nombre: string;
    veces_comprado: number;
    total_gastado_producto: number;
}

interface Props {
    segmento: string;
    title: string;
    icon?: React.ReactNode;
    colorClass?: string;
}

export const TopProductsWidget: React.FC<Props> = ({ segmento, title, icon, colorClass = "text-blue-600" }) => {
    const [products, setProducts] = useState<TopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTopProducts();
    }, [segmento]);

    const loadTopProducts = async () => {
        try {
            // Esta consulta es compleja porque cruza segmentos con pedidos
            // Por simplicidad en esta fase, usaremos la vista v_productos_favoritos_cliente
            // y filtraremos en memoria o con un join si es necesario.
            // Idealmente crearíamos una vista v_top_productos_por_segmento

            const { data, error } = await supabase
                .rpc('get_top_products_by_segment', { p_segmento: segmento });

            // Fallback si la función RPC no existe aún (la crearemos luego)
            // O simulamos con datos de la vista existente
            if (error) {
                // Fallback simple query logic simulada o consulta directa
                console.log("RPC get_top_products_by_segment not found, using fallback/empty");
                setProducts([]);
            } else {
                setProducts(data || []);
            }
        } catch (error) {
            console.error('Error loading top products', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md h-full">
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
                <div className={`p-2 rounded-full bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                    {icon || <Trophy className={`w-5 h-5 ${colorClass}`} />}
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            </div>

            {loading ? (
                <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div></div>
            ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Sin datos suficientes</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.slice(0, 5).map((prod, idx) => (
                        <div key={prod.producto_id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`text-lg font-bold w-6 ${idx === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                                    #{idx + 1}
                                </span>
                                <div>
                                    <p className="font-medium text-gray-800 line-clamp-1">{prod.producto_nombre}</p>
                                    <p className="text-xs text-gray-500">{prod.veces_comprado} ventas</p>
                                </div>
                            </div>
                            <span className="font-semibold text-gray-700 text-sm">
                                {formatCurrency(prod.total_gastado_producto)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
