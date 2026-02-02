import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Shield, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Usuario, useUsuariosStore } from '../lib/store/usuariosStore';
import { useRolesStore, Rol } from '../lib/store/rolesStore';
import toast from 'react-hot-toast';
import { CredencialesModal } from './CredencialesModal';

interface UsuarioFormModalProps {
  usuario: Usuario | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PERMISOS_POR_MODULO: Record<string, { label: string; color: string }> = {
  usuarios: { label: 'Usuarios', color: 'blue' },
  roles: { label: 'Roles', color: 'purple' },
  pedidos: { label: 'Pedidos', color: 'green' },
  productos: { label: 'Productos', color: 'orange' },
  clientes: { label: 'Clientes', color: 'cyan' },
  categorias: { label: 'Categorias', color: 'pink' },
  insumos: { label: 'Insumos', color: 'amber' },
  finanzas: { label: 'Finanzas', color: 'emerald' },
  reportes: { label: 'Reportes', color: 'slate' },
  dashboard: { label: 'Dashboard', color: 'teal' },
  envios: { label: 'Envios', color: 'rose' },
  kds: { label: 'Cocina', color: 'red' },
  proveedores: { label: 'Proveedores', color: 'indigo' },
  mermas: { label: 'Mermas', color: 'yellow' },
  stock: { label: 'Stock', color: 'lime' },
  recetas: { label: 'Recetas', color: 'fuchsia' },
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
}

function RolCard({ rol, isSelected, onToggle, expanded, onToggleExpand }: RolCardProps) {
  const permisosByModulo = groupPermisosByModulo(rol.permisos || []);
  const modulosList = Object.keys(permisosByModulo);

  return (
    <div
      className={`border-2 rounded-xl transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'border-blue-500 bg-blue-500'
              : 'border-slate-300'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 capitalize">{rol.nombre}</h4>
          {rol.descripcion && (
            <p className="text-sm text-slate-600 mt-0.5">{rol.descripcion}</p>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Permisos incluidos ({rol.permisos?.length || 0}):
          </p>

          {modulosList.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Sin permisos asignados</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {modulosList.map(modulo => {
                const config = PERMISOS_POR_MODULO[modulo] || { label: modulo, color: 'slate' };
                const count = permisosByModulo[modulo].length;

                return (
                  <span
                    key={modulo}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}
                    title={permisosByModulo[modulo].map(p => p.nombre).join(', ')}
                  >
                    {config.label}
                    <span className="bg-white/50 px-1 rounded-full">{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UsuarioFormModal({ usuario, onClose, onSuccess }: UsuarioFormModalProps) {
  const { createUsuario, updateUsuario, loading } = useUsuariosStore();
  const { roles, fetchRolesConPermisos } = useRolesStore();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    activo: true,
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCredenciales, setShowCredenciales] = useState(false);
  const [step, setStep] = useState<'info' | 'roles'>('info');

  useEffect(() => {
    fetchRolesConPermisos();
  }, []);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre || '',
        email: usuario.email || '',
        password: '',
        activo: usuario.activo ?? true,
      });

      const activeRoleIds = usuario.roles?.filter(r => r.activo).map(r => r.rol_id) || [];
      setSelectedRoles(activeRoleIds);
    }
  }, [usuario]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es valido';
    }

    if (!usuario && !formData.password.trim()) {
      newErrors.password = 'La contrasena es requerida';
    } else if (!usuario && formData.password.length < 6) {
      newErrors.password = 'La contrasena debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToRoles = () => {
    if (validate()) {
      setStep('roles');
    }
  };

  const handleBackToInfo = () => {
    setStep('info');
  };

  const toggleRole = (rolId: string) => {
    setSelectedRoles(prev =>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    if (!usuario && selectedRoles.length === 0) {
      toast.error('Debes seleccionar al menos un rol para el usuario');
      return;
    }

    try {
      if (usuario) {
        await updateUsuario(usuario.id, formData);
        toast.success('Usuario actualizado exitosamente');
        onSuccess();
      } else {
        await createUsuario({
          ...formData,
          roles: selectedRoles.map(rol_id => ({ rol_id })),
        });
        setShowCredenciales(true);
      }
    } catch (error: any) {
      console.error('Error en formulario de usuario:', error);
      const errorMessage = error.message || 'Error al guardar usuario';

      if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
        toast.error('No tienes permisos para realizar esta accion');
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('Ya existe')) {
        toast.error('Ya existe un usuario con este email');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleCloseCredenciales = () => {
    setShowCredenciales(false);
    onSuccess();
  };

  const isEditMode = !!usuario;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              {!usuario && (
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${step === 'info' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <span className={`text-xs ${step === 'info' ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                    Informacion
                  </span>
                  <div className="w-4 h-px bg-slate-300" />
                  <div className={`w-2 h-2 rounded-full ${step === 'roles' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <span className={`text-xs ${step === 'roles' ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                    Roles
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {(step === 'info' || isEditMode) && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.nombre ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Ej: Juan Perez"
                />
                {errors.nombre && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.nombre}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!usuario}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  } ${usuario ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                  placeholder="Ej: juan@ejemplo.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
                {usuario && (
                  <p className="text-xs text-slate-500 mt-1">
                    El email no se puede modificar despues de crear el usuario
                  </p>
                )}
              </div>

              {!usuario && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contrasena <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Minimo 6 caracteres"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Esta contrasena se mostrara despues de crear el usuario para que puedas compartirla.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-slate-700">
                  Usuario activo
                </label>
              </div>

              {!usuario && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 font-medium">
                    Importante: Guarda la contrasena que establezcas, ya que se mostrara solo una vez.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'roles' && !isEditMode && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Seleccionar Roles</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Asigna uno o mas roles al usuario. Los permisos son la suma de todos los roles.
                  </p>
                </div>
                {selectedRoles.length > 0 && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {selectedRoles.length} seleccionado{selectedRoles.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {roles.map(rol => (
                  <RolCard
                    key={rol.id}
                    rol={rol}
                    isSelected={selectedRoles.includes(rol.id)}
                    onToggle={() => toggleRole(rol.id)}
                    expanded={expandedRoles.includes(rol.id)}
                    onToggleExpand={() => toggleExpandRole(rol.id)}
                  />
                ))}
              </div>

              {selectedRoles.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Debes seleccionar al menos un rol para crear el usuario
                  </p>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
          {step === 'info' && !isEditMode ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleContinueToRoles}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Continuar a Roles
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </button>
            </>
          ) : step === 'roles' && !isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleBackToInfo}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Volver
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || selectedRoles.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Crear Usuario
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Actualizar
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {showCredenciales && (
        <CredencialesModal
          nombre={formData.nombre}
          email={formData.email}
          password={formData.password}
          onClose={handleCloseCredenciales}
        />
      )}
    </div>
  );
}
