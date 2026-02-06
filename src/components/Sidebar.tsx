import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  X,
  ArrowRightLeft,
  Truck,
  ClipboardList,
  Trash,
  User,
  Shield,
  ChefHat,
  PieChart,
  TrendingUp,
  Bike,
  Trophy,
  MessageCircle,
  UserCog,
  DollarSign,
  Navigation,
  BarChart3,
  Coffee
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom'; // <--- Hooks de enrutamiento
import { useUserStore } from '../lib/store/useUserStore';
import { usePermissions } from '../lib/hooks/usePermissions';
import { getAccessibleRoutes } from '../lib/utils/permissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logoSrc?: string;
}

// Mapa de iconos actualizado
const iconMap: Record<string, React.FC<{ className?: string }>> = {
  'dashboard': LayoutDashboard,             // <--- Dashboard al inicio
  'vender': ShoppingCart,
  'cocina': ChefHat,
  'pedidos': Package,
  'transacciones': ArrowRightLeft,
  'gestion-envios': Truck,
  'mis-entregas': Navigation,
  'dashboard-entregas': BarChart3,
  'dashboard-desayunos': Coffee,
  'repartidores': Bike,
  'productos': ClipboardList,
  'insumos': Package,
  'mermas': Trash,
  'clientes': Users,
  'crm': Trophy,
  'proveedores': User,
  'whatsapp': MessageCircle,
  'analytics': TrendingUp,
  'reportes': PieChart,
  'gestion-financiera': DollarSign,
  'roles': Shield,
  'usuarios': UserCog,
};

export function Sidebar({ isOpen, onClose, logoSrc }: SidebarProps) {
  const { user } = useUserStore();
  const { permisos, isLoading } = usePermissions();

  // Hooks para navegación SPA (Single Page Application)
  const navigate = useNavigate();
  const location = useLocation();

  const accessibleRoutes = getAccessibleRoutes(permisos);

  // Generamos los links con la ruta limpia (agregando la barra /)
  const navLinks = accessibleRoutes.map(route => ({
    path: `/${route.route}`, // Ej: /dashboard, /vender
    key: route.route,        // Ej: dashboard
    label: route.label,
    icon: iconMap[route.route] || Package,
  }));

  // Función para navegar sin recargar
  const handleNavigate = (path: string) => {
    navigate(path);
    onClose(); // Cerramos el menú en móvil al hacer clic
  };

  // Función para saber qué botón pintar de rojo (Activo)
  const isActive = (routeKey: string) => {
    // Obtenemos la ruta actual sin la barra inicial (ej: "vender")
    const currentPath = location.pathname.slice(1);

    // CASO ESPECIAL: Si la ruta está vacía (""), es el Dashboard por defecto
    if (currentPath === '' && routeKey === 'dashboard') return true;

    // Comparación normal (ej: "vender" === "vender")
    // Usamos startsWith para que sub-rutas (ej: /pedidos/123) mantengan activo el padre
    return currentPath.startsWith(routeKey);
  };

  return (
    <>
      {/* Overlay para móvil */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      ></div>

      {/* Sidebar Container */}
      <div
        className={`fixed top-0 left-0 h-full bg-boneWhite bg-bone-pattern z-40 transform transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0'
          } lg:relative lg:translate-x-0 ${isOpen ? 'lg:w-64' : 'lg:w-16'} flex-shrink-0 overflow-hidden shadow-xl lg:shadow-none`}
      >
        {/* Header del Sidebar (Logo) */}
        <div className="p-3 sm:p-4 flex justify-between items-center lg:justify-center flex-shrink-0 border-b border-gray-200">
          <div className="flex flex-col items-center">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 mb-2 rounded-full object-cover border-2 border-pirateRed cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleNavigate('/')}
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 mb-2 bg-pirateRed rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => handleNavigate('/')}
              >
                <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-boneWhite" />
              </div>
            )}
            <h2 className={`text-sm sm:text-lg font-bold text-pirateRed text-center ${!isOpen ? 'lg:hidden' : ''}`}>
              Los Piratas B&W
            </h2>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-pirateRed" />
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav className="mt-2 sm:mt-4 flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pirateRed"></div>
            </div>
          ) : navLinks.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Sin permisos asignados</p>
            </div>
          ) : (
            <ul className="space-y-1 px-2">
              {navLinks.map((link) => {
                const active = isActive(link.key);
                return (
                  <li key={link.key}>
                    <button
                      onClick={() => handleNavigate(link.path)}
                      className={`w-full flex items-center px-2 sm:px-4 py-2 sm:py-3 text-left transition-all rounded-lg mx-auto ${!isOpen ? 'lg:justify-center lg:px-2' : ''
                        } ${active
                          ? 'bg-pirateRed text-white shadow-md'
                          : 'text-pirateRed hover:bg-pirateRed hover:bg-opacity-10 hover:text-pirateRedDark'
                        }`}
                      title={!isOpen ? link.label : ''} // Tooltip nativo cuando está colapsado
                    >
                      <link.icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isOpen ? 'mr-3' : ''} ${active ? 'text-white' : ''}`} />
                      <span className={`text-sm sm:text-base font-medium truncate ${!isOpen ? 'lg:hidden' : ''}`}>
                        {link.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {/* Footer del Sidebar (Usuario) */}
        <div className={`p-3 sm:p-4 border-t border-gray-200 bg-pirateRed bg-opacity-5 ${!isOpen ? 'lg:px-2' : ''}`}>
          <div className="flex items-center justify-center lg:justify-start">
            <div className="w-8 h-8 bg-pirateRed rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-boneWhite" />
            </div>
            <div className={`ml-3 flex-1 min-w-0 ${!isOpen ? 'lg:hidden' : ''}`}>
              <p className="text-sm font-medium text-pirateRed truncate">
                {user?.nombre || user?.email}
              </p>
              <p className="text-xs text-pirateRedLight truncate capitalize">
                {user?.rol?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}