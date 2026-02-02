import React, { useEffect, useState } from 'react';
import { MessageCircle, Settings, Save, Phone, Key, CheckCircle, AlertCircle, Send, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import toast from 'react-hot-toast';

interface WhatsAppConfig {
  id: string;
  api_provider: 'meta' | 'twilio' | null;
  phone_number: string;
  api_token: string;
  phone_number_id: string;
  webhook_verify_token: string;
  active: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  template: string;
  variables: string[];
  active: boolean;
}

interface Message {
  id: string;
  phone_number: string;
  message_content: string;
  status: string;
  sent_at: string;
  cliente: {
    nombre: string;
  } | null;
  pedido_id: number | null;
}

export default function WhatsApp() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'history'>('config');
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState({
    api_provider: 'meta' as 'meta' | 'twilio',
    phone_number: '',
    api_token: '',
    phone_number_id: '',
    webhook_verify_token: '',
    active: false,
  });

  useEffect(() => {
    loadConfig();
    loadTemplates();
    loadMessages();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
        setFormData({
          api_provider: data.api_provider || 'meta',
          phone_number: data.phone_number || '',
          api_token: data.api_token || '',
          phone_number_id: data.phone_number_id || '',
          webhook_verify_token: data.webhook_verify_token || '',
          active: data.active,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*, cliente:clientes(nombre)')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update(dataToSave)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_config')
          .insert([dataToSave]);

        if (error) throw error;
      }

      toast.success('Configuración guardada correctamente');
      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ active: !currentStatus })
        .eq('id', templateId);

      if (error) throw error;

      toast.success(currentStatus ? 'Plantilla desactivada' : 'Plantilla activada');
      await loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Error al actualizar plantilla');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'read':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 bg-white shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
              <p className="text-sm text-gray-500">
                Automatiza comunicaciones con tus clientes
              </p>
            </div>
          </div>
          {config && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                config.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {config.active ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Activo</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Inactivo</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'config'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuración
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Plantillas ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial ({messages.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración de API
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proveedor de API
                  </label>
                  <select
                    value={formData.api_provider}
                    onChange={(e) =>
                      setFormData({ ...formData, api_provider: e.target.value as 'meta' | 'twilio' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="meta">Meta Cloud API (Recomendado)</option>
                    <option value="twilio">Twilio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Número de Teléfono
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="+52 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {formData.api_provider === 'meta' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number ID (Meta)
                    </label>
                    <input
                      type="text"
                      value={formData.phone_number_id}
                      onChange={(e) =>
                        setFormData({ ...formData, phone_number_id: e.target.value })
                      }
                      placeholder="Obtén esto en Meta Business Manager"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Key className="w-4 h-4 inline mr-1" />
                    API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={formData.api_token}
                      onChange={(e) =>
                        setFormData({ ...formData, api_token: e.target.value })
                      }
                      placeholder="Tu token de acceso"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Verify Token
                  </label>
                  <input
                    type="text"
                    value={formData.webhook_verify_token}
                    onChange={(e) =>
                      setFormData({ ...formData, webhook_verify_token: e.target.value })
                    }
                    placeholder="Token para verificar webhook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                    Activar integración de WhatsApp
                  </label>
                </div>

                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Cómo configurar</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>
                  Crea una cuenta en{' '}
                  <a
                    href="https://business.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Meta Business Manager
                  </a>
                </li>
                <li>Configura WhatsApp Business API</li>
                <li>Obtén tu Phone Number ID y Access Token</li>
                <li>Pega las credenciales aquí y activa la integración</li>
                <li>
                  Los mensajes se enviarán automáticamente según los triggers configurados
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 mt-1">
                        {template.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleTemplateStatus(template.id, template.active)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        template.active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {template.active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap mb-3">
                    {template.template}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Destinatario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Mensaje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No hay mensajes enviados aún
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(message.sent_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {message.cliente?.nombre || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">{message.phone_number}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">
                          {message.message_content}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              message.status
                            )}`}
                          >
                            {getStatusIcon(message.status)}
                            {message.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
