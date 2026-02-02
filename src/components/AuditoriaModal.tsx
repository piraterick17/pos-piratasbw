import { useEffect } from 'react';
import { X, Activity, User, Clock, FileText } from 'lucide-react';
import { Usuario, useUsuariosStore } from '../lib/store/usuariosStore';

interface AuditoriaModalProps {
  usuario: Usuario;
  onClose: () => void;
}

const accionLabels: Record<string, { text: string; color: string; icon: string }> = {
  crear: { text: 'Usuario creado', color: 'bg-green-100 text-green-700 border-green-200', icon: '✨' },
  editar: { text: 'Información editada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '✏️' },
  eliminar: { text: 'Usuario eliminado', color: 'bg-red-100 text-red-700 border-red-200', icon: '🗑️' },
  activar: { text: 'Usuario activado', color: 'bg-green-100 text-green-700 border-green-200', icon: '✅' },
  desactivar: { text: 'Usuario desactivado', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '⏸️' },
  asignar_rol: { text: 'Rol asignado', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🔐' },
  remover_rol: { text: 'Rol removido', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '🔓' },
};

export function AuditoriaModal({ usuario, onClose }: AuditoriaModalProps) {
  const { auditoriaLogs, fetchAuditoriaLogs } = useUsuariosStore();

  useEffect(() => {
    fetchAuditoriaLogs(usuario.id);
  }, [usuario.id]);

  const getTimeAgo = (fecha: string) => {
    try {
      const now = new Date();
      const date = new Date(fecha);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 30) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

      return date.toLocaleDateString();
    } catch {
      return 'Fecha inválida';
    }
  };

  const renderDataChanges = (anterior: any, nuevo: any) => {
    if (!anterior && !nuevo) return null;

    const changes: { field: string; before: string; after: string }[] = [];

    if (anterior && nuevo) {
      const fields = [...new Set([...Object.keys(anterior), ...Object.keys(nuevo)])];

      fields.forEach(field => {
        if (field === 'updated_at' || field === 'updated_by_user' || field === 'insert_date') return;

        const beforeValue = anterior[field];
        const afterValue = nuevo[field];

        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          changes.push({
            field,
            before: beforeValue ? String(beforeValue) : 'N/A',
            after: afterValue ? String(afterValue) : 'N/A'
          });
        }
      });
    }

    if (changes.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {changes.map((change, idx) => (
          <div key={idx} className="text-xs bg-slate-50 rounded p-2">
            <span className="font-medium text-slate-700">{change.field}:</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-red-600 line-through">{change.before}</span>
              <span className="text-slate-400">→</span>
              <span className="text-green-600">{change.after}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Auditoría de Usuario</h2>
              <p className="text-sm text-slate-600">{usuario.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {auditoriaLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No hay registros de auditoría para este usuario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditoriaLogs.map((log) => {
                const accionInfo = accionLabels[log.accion] || {
                  text: log.accion,
                  color: 'bg-slate-100 text-slate-700 border-slate-200',
                  icon: '📝'
                };

                return (
                  <div
                    key={log.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{accionInfo.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${accionInfo.color}`}>
                              {accionInfo.text}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <User className="w-3 h-3" />
                              <span>
                                Ejecutado por: {log.usuario_ejecutor?.email || 'Sistema'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-3 h-3" />
                              <span>
                                {getTimeAgo(log.fecha)} ({new Date(log.fecha).toLocaleString()})
                              </span>
                            </div>
                          </div>

                          {renderDataChanges(log.datos_anteriores, log.datos_nuevos)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
