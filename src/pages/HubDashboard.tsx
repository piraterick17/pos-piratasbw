import { useState } from 'react';
import {
    LayoutDashboard,
    TrendingUp,
    Truck,
    Coffee,
    ChevronRight
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import Analytics from './Analytics';
import { DashboardEntregas } from './DashboardEntregas';
import { DashboardDesayunos } from './DashboardDesayunos';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { getDateRangeMexico } from '../lib/utils/time';

type TabType = 'resumen' | 'analítica' | 'logística' | 'desayunos';

export function HubDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('resumen');
    const [dateRange, setDateRange] = useState(() => {
        const [start, end] = getDateRangeMexico('today');
        return { start, end };
    });

    const handleDateRangeChange = (start: string, end: string) => {
        setDateRange({ start, end });
    };

    const tabs = [
        { id: 'resumen', label: 'Resumen', icon: LayoutDashboard, color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50' },
        { id: 'analítica', label: 'Analítica', icon: TrendingUp, color: 'text-indigo-600', border: 'border-indigo-600', bg: 'bg-indigo-50' },
        { id: 'logística', label: 'Logística', icon: Truck, color: 'text-emerald-600', border: 'border-emerald-600', bg: 'bg-emerald-50' },
        { id: 'desayunos', label: 'Desayunos', icon: Coffee, color: 'text-orange-600', border: 'border-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-50 select-none">
            {/* Header Unificado Premium */}
            <div className="bg-white border-b border-gray-200 p-4 sm:p-6 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-pirateRed p-3 rounded-2xl shadow-lg shadow-red-100">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                Centro de Mando
                                <span className="bg-gray-100 text-gray-400 text-[10px] uppercase px-2 py-1 rounded-full font-bold tracking-widest">v2.0</span>
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">Gestión integral del negocio • {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                        <DateRangeSelector onRangeChange={handleDateRangeChange} />
                    </div>
                </div>

                {/* Sistema de Tabs Estilo Premium */}
                <div className="max-w-7xl mx-auto mt-8">
                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap border-2 ${activeTab === tab.id
                                    ? `${tab.bg} ${tab.color} ${tab.border} shadow-md translate-y-[-2px]`
                                    : 'bg-white text-gray-400 border-transparent hover:bg-gray-50 hover:text-gray-600'
                                    }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? tab.color : 'text-gray-300'}`} />
                                {tab.label}
                                {activeTab === tab.id && <ChevronRight className="w-4 h-4 opacity-50" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contenido Dinámico con Scroll Independiente */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                    {activeTab === 'resumen' && <Dashboard dateRange={dateRange} hideHeader={true} />}
                    {activeTab === 'analítica' && <Analytics dateRange={dateRange} hideHeader={true} />}
                    {activeTab === 'logística' && <DashboardEntregas dateRange={dateRange} hideHeader={true} />}
                    {activeTab === 'desayunos' && <DashboardDesayunos dateRange={dateRange} hideHeader={true} />}
                </div>
            </div>
        </div>
    );
}
