import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../lib/store/cartStore';
import { formatCurrency } from '../../lib/utils/formatters';

interface FloatingCartButtonProps {
    onClick: () => void;
}

export const FloatingCartButton = ({ onClick }: FloatingCartButtonProps) => {
    const { getCarritoItemCount, getCarritoTotalConEnvio } = useCartStore();
    const itemCount = getCarritoItemCount();
    const total = getCarritoTotalConEnvio();

    if (itemCount === 0) return null;

    return (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between bg-white/90 backdrop-blur-xl border border-pirateRed/20 text-gray-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 transition-all active:scale-95 group overflow-hidden"
            >
                <div className="flex items-center gap-3 pl-3">
                    <div className="bg-pirateRed p-2.5 rounded-xl shadow-lg shadow-pirateRed/20 group-hover:rotate-12 transition-transform">
                        <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                </div>

                <div className="flex flex-col items-start flex-1 ml-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Tu Pedido</span>
                    <span className="text-sm font-black text-gray-900 leading-none">
                        {itemCount} {itemCount === 1 ? 'Producto' : 'Productos'}
                    </span>
                </div>

                <div className="bg-gray-100 px-4 py-2.5 rounded-xl mr-1">
                    <span className="text-sm font-black text-pirateRed">
                        {formatCurrency(total)}
                    </span>
                </div>
            </button>
        </div>
    );
}
