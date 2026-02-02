import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getLocalDateStr, getMexicoDateToUTC, getEndOfDayMexico } from '../lib/utils/time';

interface DateRangeSelectorProps {
  onRangeChange: (startDate: string, endDate: string) => void;
  className?: string;
}

type QuickOption = 'hoy' | 'ayer' | 'esta_semana' | 'semana_pasada' | 'este_mes' | 'mes_pasado' | 'ultimos_7' | 'ultimos_30' | 'ultimos_90' | 'personalizado';

export function DateRangeSelector({ onRangeChange, className = '' }: DateRangeSelectorProps) {
  const [selectedOption, setSelectedOption] = useState<QuickOption>('ultimos_7');
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getDateRange = (option: QuickOption): [string, string] => {
    const now = new Date();
    const mexicoOffset = 6 * 60 * 60 * 1000;
    const mxNow = new Date(now.getTime() - mexicoOffset);

    let startDate = new Date(mxNow);
    let endDate = new Date(mxNow);

    switch (option) {
      case 'hoy':
        break;

      case 'ayer':
        startDate.setDate(mxNow.getDate() - 1);
        endDate.setDate(mxNow.getDate() - 1);
        break;

      case 'esta_semana':
        const dayOfWeek = mxNow.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(mxNow.getDate() - diffToMonday);
        break;

      case 'semana_pasada':
        const lastWeekStart = new Date(mxNow);
        const dayOfWeekLast = mxNow.getDay();
        const diffToLastMonday = dayOfWeekLast === 0 ? 13 : dayOfWeekLast + 6;
        lastWeekStart.setDate(mxNow.getDate() - diffToLastMonday);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;

      case 'este_mes':
        startDate.setDate(1);
        break;

      case 'mes_pasado':
        const lastMonth = new Date(mxNow);
        lastMonth.setMonth(mxNow.getMonth() - 1);
        startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        break;

      case 'ultimos_7':
        startDate.setDate(mxNow.getDate() - 6);
        break;

      case 'ultimos_30':
        startDate.setDate(mxNow.getDate() - 29);
        break;

      case 'ultimos_90':
        startDate.setDate(mxNow.getDate() - 89);
        break;

      case 'personalizado':
        return ['', ''];
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const startUTC = getMexicoDateToUTC(startDateStr);
    const endUTC = getEndOfDayMexico(new Date(endDateStr));

    return [startUTC, endUTC];
  };

  const handleQuickOptionChange = (option: QuickOption) => {
    setSelectedOption(option);

    if (option === 'personalizado') {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    const [start, end] = getDateRange(option);
    onRangeChange(start, end);
  };

  const handleCustomDateChange = () => {
    if (!customStartDate || !customEndDate) return;

    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }

    const startUTC = getMexicoDateToUTC(customStartDate);

    // Crear Date con hora de México (mediodía) para evitar problemas de timezone
    const endDate = new Date(customEndDate + 'T12:00:00');
    const endUTC = getEndOfDayMexico(endDate);

    onRangeChange(startUTC, endUTC);
  };

  const quickOptions = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'ayer', label: 'Ayer' },
    { value: 'esta_semana', label: 'Esta Semana' },
    { value: 'semana_pasada', label: 'Semana Pasada' },
    { value: 'este_mes', label: 'Este Mes' },
    { value: 'mes_pasado', label: 'Mes Pasado' },
    { value: 'ultimos_7', label: 'Últimos 7 días' },
    { value: 'ultimos_30', label: 'Últimos 30 días' },
    { value: 'ultimos_90', label: 'Últimos 90 días' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-sm font-semibold text-gray-900">Período de Análisis</h3>
          <span className="ml-auto text-xs text-gray-500">(Hora de México)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {quickOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleQuickOptionChange(option.value as QuickOption)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedOption === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={getLocalDateStr(new Date())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha de Fin
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={getLocalDateStr(new Date())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleCustomDateChange}
              disabled={!customStartDate || !customEndDate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
