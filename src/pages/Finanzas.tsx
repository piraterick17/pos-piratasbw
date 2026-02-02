import React, { useState, useEffect } from 'react';
import { BarChart, DollarSign, ArrowUp, ArrowDown, Plus, Calendar, Filter, Tag, Edit, Trash2 } from 'lucide-react';
import { useFinanzasStore } from '../lib/store/finanzasStore';
import { formatCurrency, formatDate } from '../lib/utils/formatters';
import { MovimientoFormModal } from '../components/MovimientoFormModal';
import { FinanzasCategoryModal } from '../components/FinanzasCategoryModal';
import toast from 'react-hot-toast';

export function Finanzas() {
  const { movimientos, categorias, fetchMovimientos, fetchCategorias, deleteMovimiento, isLoading } = useFinanzasStore();

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [editingMovimiento, setEditingMovimiento] = useState<any>(null);

  useEffect(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    setFechaInicio(primerDiaMes.toISOString().split('T')[0]);
    setFechaFin(hoy.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      fetchMovimientos(fechaInicio, fechaFin);
      fetchCategorias();
    }
  }, [fechaInicio, fechaFin, fetchMovimientos, fetchCategorias]);

  const handleEdit = (movimiento: any) => {
    // Solo permitir editar movimientos manuales
    if (movimiento.pedido_id || movimiento.movimiento_insumo_id) {
      toast.error('Los movimientos automáticos (ventas/compras) no se pueden editar.');
      return;
    }
    setEditingMovimiento(movimiento);
    setIsModalOpen(true);
  };

  const handleDelete = async (movimiento: any) => {
    if (movimiento.pedido_id || movimiento.movimiento_insumo_id) {
      toast.error('Los movimientos automáticos (ventas/compras) no se pueden eliminar.');
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      await deleteMovimiento(movimiento.id!);
      fetchMovimientos(fechaInicio, fechaFin);
    }
  };

  const filteredMovimientos = movimientos.filter(m => {
    if (selectedCategory && m.categoria_id?.toString() !== selectedCategory) {
      return false;
    }
    return true;
  });

  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
  const balance = totalIngresos - totalEgresos;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BarChart className="w-8 h-8 mr-3 text-blue-600" />
          Finanzas
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Tag className="w-4 h-4 mr-2" />
            Categorías
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Inicio</label>
             <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full p-2 border rounded-md"/>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Fin</label>
             <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full p-2 border rounded-md"/>
           </div>
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Categoría</label>
             <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 border rounded-md">
               <option value="">Todas</option>
               {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
             </select>
           </div>
           <div className="flex items-end">
             <button
               onClick={() => fetchMovimientos(fechaInicio, fechaFin)}
               className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
             >
               <Filter className="w-4 h-4 mr-2" />
               Aplicar Filtros
             </button>
           </div>
         </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-green-50 p-6 rounded-lg"><h3 className="text-sm font-medium text-green-700">Ingresos Totales</h3><p className="text-2xl font-bold text-green-900">{formatCurrency(totalIngresos)}</p></div>
        <div className="bg-red-50 p-6 rounded-lg"><h3 className="text-sm font-medium text-red-700">Egresos Totales</h3><p className="text-2xl font-bold text-red-900">{formatCurrency(totalEgresos)}</p></div>
        <div className={`p-6 rounded-lg ${balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}><h3 className={`text-sm font-medium ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balance Neto</h3><p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>{formatCurrency(balance)}</p></div>
      </div>

      {/* Lista de Movimientos */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Historial de Movimientos</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center p-8">Cargando...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMovimientos.map(m => {
                  const categoria = categorias.find(c => c.id === m.categoria_id);
                  const isAutomatic = !!(m.pedido_id || m.movimiento_insumo_id);
                  
                  return (
                  <tr key={m.id}>
                    <td className="px-6 py-4">{formatDate(m.fecha_movimiento || '')}</td>
                    <td className="px-6 py-4">
                      <div>
                        {m.descripcion}
                        {isAutomatic && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Automático
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {categoria ? categoria.nombre : 'Sin categoría'}
                    </td>
                    <td className={`px-6 py-4 font-semibold ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(m.monto)}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(m)}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                          disabled={isAutomatic}
                          title={isAutomatic ? 'Los movimientos automáticos no se pueden editar' : 'Editar movimiento'}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                          disabled={isAutomatic}
                          title={isAutomatic ? 'Los movimientos automáticos no se pueden eliminar' : 'Eliminar movimiento'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <MovimientoFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMovimiento(null);
        }}
        onSuccess={() => fetchMovimientos(fechaInicio, fechaFin)}
        movimientoToEdit={editingMovimiento}
      />

      <FinanzasCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
}