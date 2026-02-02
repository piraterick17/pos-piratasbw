import { useEffect, useState } from 'react';
import { useUsuariosStore, Usuario } from '../lib/store/usuariosStore';
import { useRolesStore } from '../lib/store/rolesStore';
import { Users, UserPlus, Search, Filter, Shield, Activity, Eye, EyeOff, Edit, Trash2, MoreVertical } from 'lucide-react';
import { UsuarioFormModal } from '../components/UsuarioFormModal';
import { RoleAssignmentModal } from '../components/RoleAssignmentModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { AuditoriaModal } from '../components/AuditoriaModal';
import toast from 'react-hot-toast';

export default function Usuarios() {
  const {
    usuarios,
    loading,
    estadisticas,
    fetchUsuarios,
    fetchEstadisticas,
    deleteUsuario,
    toggleUsuarioActivo
  } = useUsuariosStore();

  const { roles, fetchRolesConPermisos } = useRolesStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [filterRol, setFilterRol] = useState<string>('todos');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAuditoriaModal, setShowAuditoriaModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsuarios();
    fetchEstadisticas();
    fetchRolesConPermisos();
  }, []);

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch =
      usuario.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesActivo =
      filterActivo === 'todos' ||
      (filterActivo === 'activos' && usuario.activo) ||
      (filterActivo === 'inactivos' && !usuario.activo);

    const matchesRol =
      filterRol === 'todos' ||
      usuario.roles?.some(r => r.rol_id === filterRol && r.activo);

    return matchesSearch && matchesActivo && matchesRol;
  });

  const handleCreate = () => {
    setSelectedUsuario(null);
    setShowFormModal(true);
  };

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowFormModal(true);
    setOpenMenuId(null);
  };

  const handleAssignRoles = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowRoleModal(true);
    setOpenMenuId(null);
  };

  const handleViewAuditoria = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowAuditoriaModal(true);
    setOpenMenuId(null);
  };

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      await toggleUsuarioActivo(usuario.id, !usuario.activo);
      toast.success(`Usuario ${usuario.activo ? 'desactivado' : 'activado'} exitosamente`);
      setOpenMenuId(null);
    } catch (error) {
      toast.error('Error al cambiar estado del usuario');
    }
  };

  const handleDeleteClick = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowDeleteModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUsuario) return;

    try {
      await deleteUsuario(selectedUsuario.id);
      toast.success('Usuario eliminado exitosamente');
      setShowDeleteModal(false);
      setSelectedUsuario(null);
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const getRolesText = (usuario: Usuario) => {
    if (!usuario.roles || usuario.roles.length === 0) return 'Sin rol asignado';

    const activeRoles = usuario.roles.filter(r => r.activo);
    if (activeRoles.length === 0) return 'Sin rol activo';

    return activeRoles
      .map(r => r.rol?.nombre)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-600 mt-1">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold text-slate-900">{estadisticas.total_usuarios}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.usuarios_activos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <EyeOff className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Inactivos</p>
                <p className="text-2xl font-bold text-slate-600">{estadisticas.usuarios_inactivos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Roles en uso</p>
                <p className="text-2xl font-bold text-purple-600">{estadisticas.roles_en_uso}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Nuevos (30d)</p>
                <p className="text-2xl font-bold text-orange-600">{estadisticas.usuarios_nuevos_mes}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterActivo}
                onChange={(e) => setFilterActivo(e.target.value as any)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>

              <select
                value={filterRol}
                onChange={(e) => setFilterRol(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los roles</option>
                {roles.map(rol => (
                  <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {usuario.nombre?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{usuario.nombre || 'Sin nombre'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {usuario.email || 'Sin email'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {getRolesText(usuario)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        usuario.activo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(usuario.insert_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === usuario.id ? null : usuario.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </button>

                        {openMenuId === usuario.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                              <button
                                onClick={() => handleEdit(usuario)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Edit className="w-4 h-4" />
                                Editar información
                              </button>
                              <button
                                onClick={() => handleAssignRoles(usuario)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Shield className="w-4 h-4" />
                                Gestionar roles
                              </button>
                              <button
                                onClick={() => handleToggleActivo(usuario)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {usuario.activo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                {usuario.activo ? 'Desactivar' : 'Activar'}
                              </button>
                              <button
                                onClick={() => handleViewAuditoria(usuario)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <Activity className="w-4 h-4" />
                                Ver auditoría
                              </button>
                              <div className="border-t border-slate-200" />
                              <button
                                onClick={() => handleDeleteClick(usuario)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar usuario
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showFormModal && (
        <UsuarioFormModal
          usuario={selectedUsuario}
          onClose={() => {
            setShowFormModal(false);
            setSelectedUsuario(null);
          }}
          onSuccess={() => {
            setShowFormModal(false);
            setSelectedUsuario(null);
            fetchUsuarios();
            fetchEstadisticas();
          }}
        />
      )}

      {showRoleModal && selectedUsuario && (
        <RoleAssignmentModal
          usuario={selectedUsuario}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUsuario(null);
          }}
          onSuccess={() => {
            setShowRoleModal(false);
            setSelectedUsuario(null);
            fetchUsuarios();
          }}
        />
      )}

      {showAuditoriaModal && selectedUsuario && (
        <AuditoriaModal
          usuario={selectedUsuario}
          onClose={() => {
            setShowAuditoriaModal(false);
            setSelectedUsuario(null);
          }}
        />
      )}

      {showDeleteModal && selectedUsuario && (
        <ConfirmationModal
          title="Eliminar Usuario"
          message={`¿Estás seguro que deseas eliminar al usuario "${selectedUsuario.nombre}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setSelectedUsuario(null);
          }}
          type="danger"
        />
      )}
    </div>
  );
}
