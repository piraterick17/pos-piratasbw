import { useState } from 'react';
import { X, Copy, Check, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface CredencialesModalProps {
  email: string;
  password: string;
  nombre: string;
  onClose: () => void;
}

export function CredencialesModal({ email, password, nombre, onClose }: CredencialesModalProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success('Email copiado');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    toast.success('Contraseña copiada');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyBoth = async () => {
    const credentials = `Email: ${email}\nContraseña: ${password}`;
    await navigator.clipboard.writeText(credentials);
    toast.success('Credenciales copiadas');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Usuario Creado Exitosamente
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              El usuario <strong>{nombre}</strong> ha sido creado correctamente.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium mb-2">
              Importante: Guarda estas credenciales
            </p>
            <p className="text-xs text-amber-700">
              Esta es la única vez que se mostrarán. Compártelas con el usuario por un medio seguro.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={email}
                  readOnly
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
                />
                <button
                  onClick={handleCopyEmail}
                  className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Copiar email"
                >
                  {copiedEmail ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm font-mono"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-600" />
                  )}
                </button>
                <button
                  onClick={handleCopyPassword}
                  className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Copiar contraseña"
                >
                  {copiedPassword ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <button
              onClick={handleCopyBoth}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar Email y Contraseña
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entendido, cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
