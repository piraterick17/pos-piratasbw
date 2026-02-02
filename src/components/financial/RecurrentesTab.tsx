import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

export function RecurrentesTab() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Pagos Recurrentes</h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Configura y gestiona gastos que se repiten periódicamente</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Funcionalidad en Desarrollo</h3>
            <p className="text-sm sm:text-base text-blue-800 mb-3 sm:mb-4">
              Esta sección permitirá configurar y gestionar automáticamente gastos recurrentes como:
            </p>
            <ul className="list-disc list-inside text-sm sm:text-base text-blue-800 space-y-1 mb-3 sm:mb-4">
              <li>Renta y servicios (luz, agua, gas, internet)</li>
              <li>Salarios y nóminas</li>
              <li>Suscripciones y licencias</li>
              <li>Pagos programados a proveedores</li>
            </ul>
            <p className="text-sm sm:text-base text-blue-800">
              Los pagos recurrentes se crearán automáticamente según la frecuencia configurada
              (diaria, semanal, mensual, anual) y podrás gestionarlos desde aquí.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
        <div className="text-center">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Próximamente</h3>
          <p className="text-sm sm:text-base text-gray-600">
            Esta funcionalidad estará disponible en una próxima actualización
          </p>
        </div>
      </div>
    </div>
  );
}
