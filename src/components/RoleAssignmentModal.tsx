import { useState, useEffect } from 'react';
import { X, Shield, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Usuario, useUsuariosStore } from '../lib/store/usuariosStore';
import { useRolesStore, Rol } from '../lib/store/rolesStore';
import toast from 'react-hot-toast';

interface RoleAssignmentModalProps {
  usuario: Usuario;
  onClose: () => void;
  onSuccess: () => void;
}

const PERMISOS_POR_MODULO: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  usuarios: { label: 'Usuarios', color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  roles: { label: 'Roles', color: 'purple', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
  pedidos: { label: 'Pedidos', color: 'green', bgClass: 'bg-green-100', textClass: 'text-green-700' },
  productos: { label: 'Productos', color: 'orange', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
  clientes: { label: 'Clientes', color: 'cyan', bgClass: 'bg-cyan-100', textClass: 'text-cyan-700' },
  categorias: { label: 'Categorias', color: 'pink', bgClass: 'bg-pink-100', textClass: 'text-pink-700' },
  insumos: { label: 'Insumos', color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  finanzas: { label: 'Finanzas', color: 'emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700' },
  reportes: { label: 'Reportes', color: 'slate', bgClass: 'bg-slate-200', textClass: 'text-slate-700' },
  dashboard: { label: 'Dashboard', color: 'teal', bgClass: 'bg-teal-100', textClass: 'text-teal-700' },
  envios: { label: 'Envios', color: 'rose', bgClass: 'bg-rose-100', textClass: 'text-rose-700' },
  kds: { label: 'Cocina', color: 'red', bgClass: 'bg-red-100', textClass: 'text-red-700' },
  proveedores: { label: 'Proveedores', color: 'indigo', bgClass: 'bg-indigo-100', textClass: 'text-indigo-700' },
  mermas: { label: 'Mermas', color: 'yellow', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
  stock: { label: 'Stock', color: 'lime', bgClass: 'bg-lime-100', textClass: 'text-lime-700' },
  recetas: { label: 'Recetas', color: 'fuchsia', bgClass: 'bg-fuchsia-100', textClass: 'text-fuchsia-700' },
};

function getModuloFromPermiso(permisoNombre: string): string {
  return permisoNombre.split('.')[0];
}

function groupPermisosByModulo(permisos: Array<{ id: string; nombre: string; descripcion?: string }>) {
  const grouped: Record<string, Array<{ id: string; nombre: string; descripcion?: string }>> = {};

  permisos.forEach(permiso => {
    const modulo = getModuloFromPermiso(permiso.nombre);
    if (!grouped[modulo]) {
      grouped[modulo] = [];
    }
    grouped[modulo].push(permiso);
  });

  return grouped;
}

interface RolCardProps {
  rol: Rol;
  isSelected: boolean;
  onToggle: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  disabled?: boolean;
}

function RolCard({ rol, isSelected, onToggle, expanded, onToggleExpand, disabled }: RolCardProps) {
  const permisosByModulo = groupPermisosByModulo(rol.permisos || []);
  const modulosList = Object.keys(permisosByModulo);

  return (
    <div
      className={`border-2 rounded-xl transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <div
        className={`flex items-center gap-3 p-4 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && onToggle()}
      >
        <div
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-slate-300 bg-white'
          }`}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 capitalize">{rol.nombre}</h4>
          {rol.descripcion && (
            <p className="text-sm text-slate-600 mt-0.5">{rol.descripcion}</p>
          )}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-slate-500">{rol.permisos?.length || 0} permisos</span>
            {modulosList.length > 0 && (
              <>
                <span className="text-slate-300 mx-1">|</span>
                <div className="flex flex-wrap gap-1">
                  {modulosList.slice(0, 4).map(modulo => {
                    const config = PERMISOS_POR_MODULO[modulo] || { label: modulo, bgClass: 'bg-slate-100', textClass: 'text-slate-700' };
                    return (
                      <span
                        key={modulo}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bgClass} ${config.textClass}`}
                      >
                        {config.label}
                      </span>
                    );
                  })}
                  {modulosList.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      +{modulosList.length - 4}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">
              Permisos incluidos en este rol:
            </p>
          </div>

          {modulosList.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Sin permisos asignados</p>
          ) : (
            <div className="space-y-3">
              {modulosList.map(modulo => {
                const config = PERMISOS_POR_MODULO[modulo] || { label: modulo, bgClass: 'bg-slate-100', textClass: 'text-slate-700' };
                const permisos = permisosByModulo[modulo];

                return (
                  <div key={modulo} className="space-y-1.5">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgClass}`}>
                      <span className={`text-xs font-semibold ${config.textClass}`}>
                        {config.label}
                      </span>
                      <span className={`text-[10px] ${config.textClass} opacity-70`}>
                        ({permisos.length})
                      </span>
                    </div>
                    <div className="pl-2 space-y-1">
                      {permisos.map(permiso => (
                        <div key={permiso.id} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-400 mt-2" />
                          <div>
                            <span className="text-xs text-slate-700 font-medium">
                              {permiso.nombre.split('.').slice(1).join('.')}
                            </span>
                            {permiso.descripcion && (
                              <p className="text-[11px] text-slate-500">{permiso.descripcion}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RoleAssignmentModal({ usuario, onClose, onSuccess }: RoleAssignmentModalProps) {
  const { asignarRol, removerRol, fetchUsuarioById } = useUsuariosStore();
  const { roles, fetchRolesConPermisos } = useRolesStore();

  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [pendingRoles, setPendingRoles] = useState<string[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await fetchRolesConPermisos();
      await loadCurrentRoles();
      setInitialLoading(false);
    };
    loadData();
  }, [usuario.id]);

  const loadCurrentRoles = async () => {
    const updatedUsuario = await fetchUsuarioById(usuario.id);
    if (updatedUsuario?.roles) {
      const activeRoleIds = updatedUsuario.roles
        .filter(r => r.activo)
        .map(r => r.rol_id);
      setCurrentRoles(activeRoleIds);
      setPendingRoles(activeRoleIds);
    }
  };

  const toggleRole = (rolId: string) => {
    setPendingRoles(prev =>
      prev.includes(rolId)
        ? prev.filter(id => id !== rolId)
        : [...prev, rolId]
    );
  };

  const toggleExpandRole = (rolId: string) => {
    setExpandedRoles(prev =>
      prev.includes(rolId)
        ? prev.filter(id => id !== rolId)
        : [...prev, rolId]
    );
  };

  const hasChanges = () => {
    if (currentRoles.length !== pendingRoles.length) return true;
    return !currentRoles.every(id => pendingRoles.includes(id));
  };

  const handleSave = async () => {
    if (pendingRoles.length === 0) {
      toast.error('Un usuario debe tener al menos un rol asignado');
      return;
    }

    setLoading(true);
    try {
      const rolesToAdd = pendingRoles.filter(id => !currentRoles.includes(id));
      const rolesToRemove = currentRoles.filter(id => !pendingRoles.includes(id));

      for (const rolId of rolesToRemove) {
        await removerRol(usuario.id, rolId);
      }

      for (const rolId of rolesToAdd) {
        await asignarRol(usuario.id, rolId);
      }

      toast.success('Roles actualizados exitosamente');
      onSuccess();
    } catch (error: any) {
      toast.error('Error al actualizar roles');
    } finally {
      setLoading(false);
    }
  };

  const getEffectivePermisos = () => {
    const selectedRoles = roles.filter(r => pendingRoles.includes(r.id));
    const allPermisos = new Map<string, { id: string; nombre: string; descripcion?: string }>();

    selectedRoles.forEach(rol => {
      rol.permisos?.forEach(permiso => {
        if (!allPermisos.has(permiso.nombre)) {
          allPermisos.set(permiso.nombre, permiso);
        }
      });
    });

    return Array.from(allPermisos.values());
  };

  const effectivePermisos = getEffectivePermisos();
  const effectivePermisosByModulo = groupPermisosByModulo(effectivePermisos);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gestionar Roles</h2>
              <p className="text-sm text-slate-600">{usuario.nombre} - {usuario.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {initialLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-y-auto p-6 border-r border-slate-200">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Roles Disponibles</h3>
                <p className="text-xs text-slate-500">
                  Selecciona los roles que deseas asignar a este usuario
                </p>
              </div>

              <div className="space-y-3">
                {roles.map(rol => (
                  <RolCard
                    key={rol.id}
                    rol={rol}
                    isSelected={pendingRoles.includes(rol.id)}
                    onToggle={() => toggleRole(rol.id)}
                    expanded={expandedRoles.includes(rol.id)}
                    onToggleExpand={() => toggleExpandRole(rol.id)}
                  />
                ))}
              </div>
            </div>

            <div className="w-80 bg-slate-50 p-6 overflow-y-auto">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Resumen de Permisos</h3>
                <p className="text-xs text-slate-500">
                  Permisos efectivos basados en los roles seleccionados
                </p>
              </div>

              {pendingRoles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    Selecciona al menos un rol
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Total de permisos:</span>
                      <span className="text-lg font-bold text-blue-600">{effectivePermisos.length}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-medium text-slate-600">Roles asignados:</span>
                      <span className="text-lg font-bold text-slate-900">{pendingRoles.length}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.keys(effectivePermisosByModulo).map(modulo => {
                      const config = PERMISOS_POR_MODULO[modulo] || { label: modulo, bgClass: 'bg-slate-100', textClass: 'text-slate-700' };
                      const permisos = effectivePermisosByModulo[modulo];

                      return (
                        <div key={modulo} className="bg-white rounded-lg border border-slate-200 p-3">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgClass} mb-2`}>
                            <span className={`text-xs font-semibold ${config.textClass}`}>
                              {config.label}
                            </span>
                            <span className={`text-[10px] ${config.textClass} opacity-70`}>
                              ({permisos.length})
                            </span>
                          </div>
                          <div className="space-y-1">
                            {permisos.map(permiso => (
                              <div key={permiso.id} className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-slate-600">
                                  {permiso.nombre.split('.').slice(1).join('.')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            {hasChanges() && (
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                Hay cambios sin guardar
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges() || pendingRoles.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
