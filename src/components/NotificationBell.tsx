import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Settings } from 'lucide-react';
import { useNotifications } from '../lib/hooks/useNotifications';
import { formatDistanceToNow } from '../lib/utils/formatters';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    config,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateConfig,
  } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case 'pedido':
        return '🔔';
      case 'stock':
        return '⚠️';
      case 'mensaje':
        return '💬';
      case 'pago':
        return '💰';
      case 'entrega':
        return '🚗';
      case 'cocina':
        return '👨‍🍳';
      default:
        return '🔔';
    }
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.leida) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      window.location.href = notification.link;
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-6 h-6 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-400 hover:text-gray-600"
                title="Configuración"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showSettings && config && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Configuración</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nuevos pedidos</span>
                  <input
                    type="checkbox"
                    checked={config.nuevo_pedido}
                    onChange={(e) => updateConfig({ nuevo_pedido: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock bajo</span>
                  <input
                    type="checkbox"
                    checked={config.stock_bajo}
                    onChange={(e) => updateConfig({ stock_bajo: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pedidos listos</span>
                  <input
                    type="checkbox"
                    checked={config.pedido_listo}
                    onChange={(e) => updateConfig({ pedido_listo: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Sonido</span>
                  <input
                    type="checkbox"
                    checked={config.sonido}
                    onChange={(e) => updateConfig({ sonido: e.target.checked })}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.leida ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {notification.icono || getIconForType(notification.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${!notification.leida ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.titulo}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className={`text-sm mt-1 ${!notification.leida ? 'text-gray-700' : 'text-gray-500'}`}>
                          {notification.mensaje}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at))}
                          </span>
                          {!notification.leida && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Marcar como leída
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
