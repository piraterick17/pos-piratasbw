import React, { useEffect, useState } from 'react';
import { Users, Trophy, TrendingUp, AlertCircle, Gift, Star, Phone, DollarSign, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/utils/formatters';
import { ClienteDetalleModal } from '../components/ClienteDetalleModal';
import { SalesDistributionChart } from '../components/CRM/SalesDistributionChart';
import { BusinessHealthChart } from '../components/CRM/BusinessHealthChart';
import { TopProductsWidget } from '../components/CRM/TopProductsWidget';
import { getDateRangeMexico } from '../lib/utils/time';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { CampaignManager } from '../components/CRM/CampaignManager';

interface ClienteMetrica {
  cliente_id: string;
  nombre: string;
  telefono: string;
  email: string;
  segmento: string;
  total_pedidos: number;
  total_gastado: number;
  ticket_promedio: number;
  ultima_compra: string;
  dias_sin_comprar: number;
  puntos_actuales: number;
  nivel_lealtad: string;
}

// Helper Component for KPI Buttons
const KPIButton = ({ icon: Icon, value, label, active, onClick, colorClass }: any) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${active
      ? `bg-white border-${colorClass} shadow-md ring-1 ring-${colorClass}`
      : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
      }`}
  >
    <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon className={`w-12 h-12 text-${colorClass}`} />
    </div>
    <div className="relative z-10">
      <div className={`flex items-center gap-2 mb-2 ${active ? `text-${colorClass}` : 'text-gray-500'}`}>
        <Icon className="w-5 h-5" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </button>
);

export default function CRM() {
  const [clientes, setClientes] = useState<ClienteMetrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSegmento, setFiltroSegmento] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalClientes, setTotalClientes] = useState(0);
  const PAGE_SIZE = 50;

  // Date Range State
  const [dateRange, setDateRange] = useState(() => {
    const [start, end] = getDateRangeMexico('thisMonth'); // Default to this month
    return { start, end, type: 'mes' as 'hoy' | 'semana' | 'mes' | 'custom' };
  });

  const handleRangeChange = (start: string, end: string) => {
    setDateRange(prev => ({ ...prev, start, end, type: 'custom' }));
  };

  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    vip: 0,
    regular: 0,
    nuevo: 0,
    en_riesgo: 0,
    inactivo: 0,
  });

  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  // ... (existing code)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">CRM y Fidelización</h1>
            <p className="text-gray-500 text-sm">Centro de inteligencia de clientes y lealtad</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <DateRangeSelector variant="inline" onRangeChange={handleRangeChange} />
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">
                Descargar Reporte
              </button>
              <button
                onClick={() => setIsCampaignModalOpen(true)}
                className="px-4 py-2 bg-pirateRed text-white rounded-lg hover:bg-pirateRedDark text-sm font-medium shadow-sm transition-colors"
              >
                Nueva Campaña
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ... (existing content) ... */}
        <div className="max-w-7xl mx-auto space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* ... */}
            <KPIButton
              icon={Users}
              value={estadisticas.total}
              label="Todos"
              active={filtroSegmento === 'todos'}
              onClick={() => {
                setFiltroSegmento('todos');
                setPage(0);
              }}
              colorClass="pirateRed"
            />
            <KPIButton
              icon={Trophy}
              value={estadisticas.vip}
              label="VIP"
              active={filtroSegmento === 'vip'}
              onClick={() => {
                setFiltroSegmento('vip');
                setPage(0);
              }}
              colorClass="purple-600"
            />
            <KPIButton
              icon={Star}
              value={estadisticas.regular}
              label="Regular"
              active={filtroSegmento === 'regular'}
              onClick={() => {
                setFiltroSegmento('regular');
                setPage(0);
              }}
              colorClass="blue-600"
            />
            <KPIButton
              icon={Gift}
              value={estadisticas.nuevo}
              label="Registrados"
              active={filtroSegmento === 'nuevo'}
              onClick={() => {
                setFiltroSegmento('nuevo');
                setPage(0);
              }}
              colorClass="green-600"
            />
            <KPIButton
              icon={AlertCircle}
              value={estadisticas.en_riesgo}
              label="En Riesgo"
              active={filtroSegmento === 'en_riesgo'}
              onClick={() => {
                setFiltroSegmento('en_riesgo');
                setPage(0);
              }}
              colorClass="orange-600"
            />
            <KPIButton
              icon={TrendingUp}
              value={estadisticas.inactivo}
              label="Inactivo"
              active={filtroSegmento === 'inactivo'}
              onClick={() => {
                setFiltroSegmento('inactivo');
                setPage(0);
              }}
              colorClass="gray-600"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SalesDistributionChart
                data={[
                  { segmento: 'VIP', total: clientes.filter(c => c.segmento === 'vip').reduce((acc, c) => acc + (c.total_gastado || 0), 0), color: '#9333ea' },
                  { segmento: 'Regular', total: clientes.filter(c => c.segmento === 'regular').reduce((acc, c) => acc + (c.total_gastado || 0), 0), color: '#2563eb' },
                  { segmento: 'Nuevo', total: clientes.filter(c => c.segmento === 'nuevo').reduce((acc, c) => acc + (c.total_gastado || 0), 0), color: '#16a34a' },
                  { segmento: 'En Riesgo', total: clientes.filter(c => c.segmento === 'en_riesgo').reduce((acc, c) => acc + (c.total_gastado || 0), 0), color: '#ea580c' },
                ]}
              />
            </div>
            <div className="lg:col-span-2">
              <BusinessHealthChart />
            </div>
          </div>

          {/* Top Products & Actionable Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TopProductsWidget
              segmento="vip"
              title="Favoritos VIP"
              icon={<Trophy className="w-5 h-5 text-purple-600" />}
              colorClass="text-purple-600"
            />
            <TopProductsWidget
              segmento="en_riesgo"
              title="Favoritos en Riesgo"
              icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
              colorClass="text-orange-600"
            />
            <TopProductsWidget
              segmento="regular"
              title="Potencial Upsell (Regulares)"
              icon={<Star className="w-5 h-5 text-blue-600" />}
              colorClass="text-blue-600"
            />
          </div>

          {/* Cliente Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Detalle de Clientes</h2>

              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Eye className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-pirateRed focus:ring-1 focus:ring-pirateRed sm:text-sm transition duration-150 ease-in-out"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0); // Reset page on search
                  }}
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Segmento
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gastado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Compra
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lealtad
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientes.length > 0 ? (
                    clientes.map((cliente) => {
                      const segmentoConfig = getSegmentoConfig(cliente.segmento);
                      const SegmentoIcon = segmentoConfig.icon;

                      return (
                        <tr key={cliente.cliente_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
                                  {cliente.nombre.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                                <div className="text-sm text-gray-500">{cliente.telefono}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full gap-1 items-center border ${segmentoConfig.color}`}>
                              <SegmentoIcon className="w-3 h-3" />
                              {segmentoConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{formatCurrency(cliente.total_gastado)}</div>
                            <div className="text-xs text-gray-500">{cliente.total_pedidos} pedidos</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString() : 'Nunca'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {cliente.dias_sin_comprar > 0 ? `Hace ${cliente.dias_sin_comprar} días` : 'Hoy'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`text-sm ${getNivelColor(cliente.nivel_lealtad)} capitalize`}>
                                {cliente.nivel_lealtad || 'Bronce'}
                              </span>
                              <span className="text-xs text-gray-500">{cliente.puntos_actuales || 0} pts</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedClienteId(cliente.cliente_id);
                                setIsModalOpen(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors"
                              title="Ver detalle completo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        No se encontraron clientes que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={clientes.length < PAGE_SIZE}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{page * PAGE_SIZE + 1}</span> a <span className="font-medium">{Math.min((page + 1) * PAGE_SIZE, totalClientes)}</span> de <span className="font-medium">{totalClientes}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Anterior</span>
                      Anterior
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Página {page + 1}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={clientes.length < PAGE_SIZE || (page + 1) * PAGE_SIZE >= totalClientes}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Siguiente</span>
                      Siguiente
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedClienteId && (
          <ClienteDetalleModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedClienteId(null);
            }}
            clienteId={selectedClienteId}
          />
        )}
      </div>

      <CampaignManager
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        initialSegment={filtroSegmento !== 'todos' ? filtroSegmento : 'todos'}
      />
    </div>
  );
}
