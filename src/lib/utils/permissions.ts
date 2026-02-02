export interface RoutePermission {
  route: string;
  label: string;
  permissions: string[];
  requiresAll?: boolean;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    route: 'vender',
    label: 'Vender',
    permissions: ['pedidos.crear'],
    requiresAll: false,
  },
  {
    route: 'cocina',
    label: 'Sistema de Cocina',
    permissions: ['kds.ver'],
    requiresAll: false,
  },
  {
    route: 'pedidos',
    label: 'Pedidos Activos',
    permissions: ['pedidos.leer', 'pedidos.gestionar'],
    requiresAll: false,
  },
  {
    route: 'transacciones',
    label: 'Transacciones',
    permissions: ['finanzas.gestionar', 'pedidos.leer'],
    requiresAll: false,
  },
  {
    route: 'gestion-envios',
    label: 'Envios',
    permissions: ['envios.ver.pendientes', 'envios.gestionar.zonas'],
    requiresAll: false,
  },
  {
    route: 'mis-entregas',
    label: 'Mis Entregas',
    permissions: ['envios.repartidor.ver'],
    requiresAll: false,
  },
  {
    route: 'dashboard-entregas',
    label: 'Dashboard Entregas',
    permissions: ['envios.ver.pendientes', 'reportes.ver'],
    requiresAll: false,
  },
  {
    route: 'dashboard-desayunos',
    label: 'Dashboard Desayunos',
    permissions: ['dashboard.ver', 'reportes.ver'],
    requiresAll: false,
  },
  {
    route: 'repartidores',
    label: 'Repartidores',
    permissions: ['envios.ver.pendientes', 'usuarios.gestionar'],
    requiresAll: false,
  },
  {
    route: 'productos',
    label: 'Productos',
    permissions: ['productos.gestionar'],
    requiresAll: false,
  },
  {
    route: 'insumos',
    label: 'Insumos',
    permissions: ['insumos.gestionar'],
    requiresAll: false,
  },
  {
    route: 'mermas',
    label: 'Mermas',
    permissions: ['mermas.registrar', 'mermas.ver.historial'],
    requiresAll: false,
  },
  {
    route: 'clientes',
    label: 'Clientes',
    permissions: ['clientes.leer', 'clientes.gestionar', 'clientes.actualizar'],
    requiresAll: false,
  },
  {
    route: 'crm',
    label: 'CRM y Lealtad',
    permissions: ['clientes.gestionar', 'clientes.leer'],
    requiresAll: false,
  },
  {
    route: 'proveedores',
    label: 'Proveedores',
    permissions: ['proveedores.gestionar'],
    requiresAll: false,
  },
  {
    route: 'whatsapp',
    label: 'WhatsApp',
    permissions: ['clientes.leer', 'pedidos.crear'],
    requiresAll: false,
  },
  {
    route: 'dashboard',
    label: 'Dashboard',
    permissions: ['dashboard.ver'],
    requiresAll: false,
  },
  {
    route: 'analytics',
    label: 'Analisis Avanzado',
    permissions: ['reportes.ver'],
    requiresAll: false,
  },
  {
    route: 'reportes',
    label: 'Reportes',
    permissions: ['reportes.ver'],
    requiresAll: false,
  },
  {
    route: 'gestion-financiera',
    label: 'Gestion Financiera',
    permissions: ['finanzas.gestionar'],
    requiresAll: false,
  },
  {
    route: 'roles',
    label: 'Roles y Permisos',
    permissions: ['roles.gestionar'],
    requiresAll: false,
  },
  {
    route: 'usuarios',
    label: 'Usuarios',
    permissions: ['usuarios.gestionar', 'usuarios.ver'],
    requiresAll: false,
  },
];

export function hasRouteAccess(userPermissions: string[], routePermissions: string[], requiresAll: boolean = false): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  if (requiresAll) {
    return routePermissions.every(permission => userPermissions.includes(permission));
  } else {
    return routePermissions.some(permission => userPermissions.includes(permission));
  }
}

export function getAccessibleRoutes(userPermissions: string[]): RoutePermission[] {
  return ROUTE_PERMISSIONS.filter(route =>
    hasRouteAccess(userPermissions, route.permissions, route.requiresAll)
  );
}
