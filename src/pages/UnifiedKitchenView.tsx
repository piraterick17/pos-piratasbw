import React, { useState, useEffect } from 'react';
import { ChefHat, Layers } from 'lucide-react';
import { KitchenDisplay } from './KitchenDisplay';
import { KitchenDisplayV2 } from './KitchenDisplayV2';

type ViewMode = 'general' | 'stations';

export function UnifiedKitchenView() {
  const [activeView, setActiveView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('kitchen-view-preference');
    return (saved as ViewMode) || 'general';
  });

  useEffect(() => {
    localStorage.setItem('kitchen-view-preference', activeView);
  }, [activeView]);

  const tabs = [
    {
      id: 'general' as ViewMode,
      label: 'Vista General',
      icon: ChefHat,
      description: 'Vista de pedidos completos con progreso'
    },
    {
      id: 'stations' as ViewMode,
      label: 'Por Estaciones',
      icon: Layers,
      description: 'Organización por estación de cocina'
    }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs de navegación */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-4 gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Sistema de Cocina</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Gestión de pedidos y preparación</p>
              </div>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2.5 rounded-t-lg font-medium text-sm
                    whitespace-nowrap transition-all duration-200
                    ${isActive
                      ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                  title={tab.description}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                      Activo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido de la vista activa */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeView === 'general' && <KitchenDisplay />}
        {activeView === 'stations' && <KitchenDisplayV2 />}
      </div>
    </div>
  );
}
