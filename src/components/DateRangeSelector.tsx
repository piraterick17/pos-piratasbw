import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { getLocalDateStr, getMexicoDateToUTC, getEndOfDayMexico } from '../lib/utils/time';

interface DateRangeSelectorProps {
  onRangeChange: (startDate: string, endDate: string) => void;
  className?: string;
  variant?: 'card' | 'inline';
}

type QuickOption = 'hoy' | 'ayer' | 'esta_semana' | 'semana_pasada' | 'este_mes' | 'mes_pasado' | 'ultimos_7' | 'ultimos_30' | 'ultimos_90' | 'personalizado';

export function DateRangeSelector({ onRangeChange, className = '', variant = 'card' }: DateRangeSelectorProps) {
  const [selectedOption, setSelectedOption] = useState<QuickOption>('ultimos_7');
  const [showCustom, setShowCustom] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const isInline = variant === 'inline';

  const getDateRange = (option: QuickOption): [string, string] => {
    // ... (rest of getDateRange logic is unchanged)
    const now = new Date();
    const mexicoOffset = 6 * 60 * 60 * 1000;
    const mxDate = new Date(now.getTime() - mexicoOffset);

    let startDate = new Date(mxDate.getTime());
    let endDate = new Date(mxDate.getTime());

    switch (option) {
      case 'hoy': break;
      case 'ayer':
        startDate.setDate(mxDate.getDate() - 1);
        endDate.setDate(mxDate.getDate() - 1);
        break;
      case 'esta_semana':
        const dayOfWeek = mxDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(mxDate.getDate() - diffToMonday);
        break;
      case 'semana_pasada':
        const lastWeekStart = new Date(mxDate);
        const dayOfWeekLast = mxDate.getDay();
        const diffToLastMonday = (dayOfWeekLast === 0 ? 6 : dayOfWeekLast - 1) + 7;
        lastWeekStart.setDate(mxDate.getDate() - diffToLastMonday);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case 'este_mes': startDate.setDate(1); break;
      case 'mes_pasado':
        const lastMonth = new Date(mxDate);
        lastMonth.setMonth(mxDate.getMonth() - 1);
        startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        break;
      case 'ultimos_7': startDate.setDate(mxDate.getDate() - 6); break;
      case 'ultimos_30': startDate.setDate(mxDate.getDate() - 29); break;
      case 'ultimos_90': startDate.setDate(mxDate.getDate() - 89); break;
      case 'personalizado': return ['', ''];
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const startUTC = getMexicoDateToUTC(startDateStr);
    const endUTC = getEndOfDayMexico(new Date(endDateStr + 'T12:00:00'));

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
    const endDate = new Date(customEndDate + 'T12:00:00');
    const endUTC = getEndOfDayMexico(endDate);
    onRangeChange(startUTC, endUTC);
  };

  const quickOptions = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'esta_semana', label: 'Semana' },
    { value: 'este_mes', label: 'Mes' },
    { value: 'ultimos_7', label: '7 días' },
    { value: 'ultimos_30', label: '30 días' },
    { value: 'personalizado', label: 'Personalizado' },
  ];

  if (isInline) {
    return (
      <div className={`flex flex-col md:flex-row items-start md:items-center gap-2 ${className}`}>
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar border border-gray-200 shadow-inner">
          {quickOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleQuickOptionChange(option.value as QuickOption)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedOption === option.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex items-center gap-1.5 p-1 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-left-2 duration-300">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-transparent text-[10px] font-bold p-1 border-none focus:ring-0 w-[100px]"
            />
            <span className="text-[10px] text-blue-300">-</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-transparent text-[10px] font-bold p-1 border-none focus:ring-0 w-[100px]"
            />
            <button
              onClick={handleCustomDateChange}
              disabled={!customStartDate || !customEndDate}
              className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-sm font-semibold text-gray-900">Período de Análisis</h3>
          <span className="ml-auto text-xs text-gray-500">(Hora de México)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {[...quickOptions, { value: 'ayer', label: 'Ayer' }, { value: 'semana_pasada', label: 'Semana Pasada' }, { value: 'mes_pasado', label: 'Mes Pasado' }, { value: 'ultimos_90', label: '90 días' }]
            .sort((a, b) => a.label.length - b.label.length)
            .map((option) => (quickOptions.some(q => q.value === option.value) || ['ayer', 'semana_pasada', 'mes_pasado', 'ultimos_90'].includes(option.value)) && (
              <button
                key={option.value}
                onClick={() => handleQuickOptionChange(option.value as QuickOption)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedOption === option.value
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={getLocalDateStr(new Date())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Fin</label>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 whitespace-nowrap"
            >
              Aplicar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
