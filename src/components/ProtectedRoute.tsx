import { ReactNode } from 'react';
import { Shield, Lock } from 'lucide-react';
import { usePermissions } from '../lib/hooks/usePermissions';
import { ROUTE_PERMISSIONS, hasRouteAccess } from '../lib/utils/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  routeName: string;
}

export function ProtectedRoute({ children, routeName }: ProtectedRouteProps) {
  const { permisos, isLoading } = usePermissions();

  const routeConfig = ROUTE_PERMISSIONS.find(r => r.route === routeName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!routeConfig) {
    return <>{children}</>;
  }

  const hasAccess = hasRouteAccess(permisos, routeConfig.permissions, routeConfig.requiresAll);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600 mb-6">
            No tienes los permisos necesarios para acceder a esta seccion.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Permisos requeridos:</span>
            </div>
            <ul className="space-y-1 text-left">
              {routeConfig.permissions.map(permission => (
                <li key={permission} className="text-xs text-slate-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                  {permission}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => {
              window.location.hash = '#vender';
              window.location.reload();
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
