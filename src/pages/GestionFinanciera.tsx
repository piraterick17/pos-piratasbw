import React, { useState } from 'react';
import { BarChart, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { FinancialDashboard } from '../components/financial/FinancialDashboard';
import { CuentasPorPagarTab } from '../components/financial/CuentasPorPagarTab';
import { MovimientosTab } from '../components/financial/MovimientosTab';
import { RecurrentesTab } from '../components/financial/RecurrentesTab';

type TabType = 'dashboard' | 'cuentas-por-pagar' | 'movimientos' | 'recurrentes';

export function GestionFinanciera() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as TabType, name: 'Dashboard', icon: TrendingUp, shortName: 'Inicio' },
    { id: 'cuentas-por-pagar' as TabType, name: 'Cuentas por Pagar', icon: CreditCard, shortName: 'CxP' },
    { id: 'movimientos' as TabType, name: 'Movimientos', icon: BarChart, shortName: 'Movs.' },
    { id: 'recurrentes' as TabType, name: 'Recurrentes', icon: Calendar, shortName: 'Rec.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center mb-2">
            <BarChart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mr-2 sm:mr-3 text-blue-600" />
            Gestión Financiera
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            Control total de ingresos, egresos y cuentas por pagar
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs sm:text-sm font-medium whitespace-nowrap
                      border-b-2 transition-colors flex-shrink-0
                      ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">{tab.name}</span>
                    <span className="inline sm:hidden">{tab.shortName}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3 sm:p-4 md:p-6">
            {activeTab === 'dashboard' && <FinancialDashboard />}
            {activeTab === 'cuentas-por-pagar' && <CuentasPorPagarTab />}
            {activeTab === 'movimientos' && <MovimientosTab />}
            {activeTab === 'recurrentes' && <RecurrentesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
