interface ProgressIndicatorProps {
  clienteSeleccionado: any;
  tipoEntregaId: number | null;
  carritoCount: number;
  direccionCompleta: boolean;
  isComplete: boolean;
}

export function ProgressIndicator({
  clienteSeleccionado,
  tipoEntregaId,
  carritoCount,
  direccionCompleta,
  isComplete,
}: ProgressIndicatorProps) {
  const requirements = [
    {
      label: 'Cliente',
      completed: !!clienteSeleccionado,
    },
    {
      label: 'Tipo Entrega',
      completed: !!tipoEntregaId,
    },
    {
      label: 'Dirección',
      completed: direccionCompleta,
    },
    {
      label: 'Productos',
      completed: carritoCount > 0,
    },
  ];

  const completedCount = requirements.filter(r => r.completed).length;
  /* const progress = (completedCount / requirements.length) * 100; */

  return (
    <div className="p-3 sm:p-4 bg-white border-b border-gray-100 space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-black text-gray-400">Paso a Paso</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-md ${isComplete ? 'bg-green-100 text-green-600' : 'bg-pirateRed/10 text-pirateRed'}`}>
            {completedCount}/4
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden flex gap-0.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`flex-1 h-full transition-all duration-500 rounded-full ${step <= completedCount
                ? (isComplete ? 'bg-green-500' : 'bg-pirateRed shadow-[0_0_8px_rgba(184,28,28,0.4)]')
                : 'bg-gray-200'
              }`}
          />
        ))}
      </div>

      {!isComplete && (
        <div className="flex items-center gap-2 p-1.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <p className="text-[8px] sm:text-[9px] font-bold text-amber-700 uppercase tracking-tighter">
            Faltan datos obligatorios para procesar la orden
          </p>
        </div>
      )}
    </div>
  );
}
