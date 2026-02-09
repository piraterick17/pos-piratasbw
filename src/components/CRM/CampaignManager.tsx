import React, { useState, useEffect } from 'react';
import { X, Users, Send, MessageSquare, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import toast from 'react-hot-toast';

interface CampaignManagerProps {
    isOpen: boolean;
    onClose: () => void;
    initialSegment?: string;
}

interface ClienteTarget {
    id: string;
    nombre: string;
    telefono: string;
    segmento: string;
}

export function CampaignManager({ isOpen, onClose, initialSegment = 'todos' }: CampaignManagerProps) {
    const [step, setStep] = useState(1); // 1: Seleccion, 2: Mensaje, 3: Ejecucion
    const [segmento, setSegmento] = useState(initialSegment);
    const [clientes, setClientes] = useState<ClienteTarget[]>([]);
    const [loading, setLoading] = useState(false);

    // Mensaje
    const [mensaje, setMensaje] = useState('¡Hola [Nombre]! Te extrañamos en Piratas. Ven y disfruta de un descuento especial.');
    const [copiado, setCopiado] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSegmento(initialSegment);
            setStep(1);
        }
    }, [isOpen, initialSegment]);

    const loadClientes = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('v_metricas_clientes')
                .select('cliente_id, nombre, telefono, segmento');

            if (segmento !== 'todos') {
                query = query.eq('segmento', segmento);
            }

            // Filtrar clientes con telefono
            query = query.not('telefono', 'is', null);

            const { data, error } = await query;

            if (error) throw error;

            // Map to ClienteTarget (ensure unique IDs if needed, though cliente_id should be unique)
            const mappedClientes = (data || []).map((c: any) => ({
                id: c.cliente_id,
                nombre: c.nombre,
                telefono: c.telefono,
                segmento: c.segmento
            }));

            setClientes(mappedClientes);
            if (mappedClientes.length > 0) {
                setStep(2);
            } else {
                toast.error('No se encontraron clientes con teléfono en este segmento.');
            }
        } catch (error) {
            console.error('Error loading targets:', error);
            toast.error('Error al cargar la lista de clientes');
        } finally {
            setLoading(false);
        }
    };

    const getPreview = () => {
        return mensaje.replace('[Nombre]', 'Juan Pérez');
    };

    const generateWhatsAppLink = (cliente: ClienteTarget) => {
        const text = mensaje.replace('[Nombre]', cliente.nombre.split(' ')[0]); // Usar solo el primer nombre
        const encodedText = encodeURIComponent(text);
        // Limpiar telefono (quitar espacios, guiones, etc.)
        const rawPhone = cliente.telefono.replace(/\D/g, '');
        // Asumir codigo de pais si falta (Mexico 52)
        const phone = rawPhone.length === 10 ? `52${rawPhone}` : rawPhone;

        return `https://wa.me/${phone}?text=${encodedText}`;
    };

    const copyToClipboard = () => {
        // Generar lista de links? O solo el mensaje base?
        // Copiar el mensaje base
        navigator.clipboard.writeText(mensaje);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
        toast.success('Mensaje copiado');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-pirateRed" />
                            Nueva Campaña
                        </h2>
                        <p className="text-xs text-gray-500">Envía mensajes masivos por WhatsApp</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* STEP 1: SEGMENTO */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">1. Selecciona el público objetivo</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { id: 'todos', label: 'Todos', icon: Users },
                                    { id: 'vip', label: 'VIPs', icon: Users }, // Iconos podrian ser especificos
                                    { id: 'regular', label: 'Regulares', icon: Users },
                                    { id: 'nuevo', label: 'Nuevos', icon: Users },
                                    { id: 'en_riesgo', label: 'En Riesgo', icon: Users },
                                    { id: 'inactivo', label: 'Inactivos', icon: Users },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSegmento(s.id)}
                                        className={`p-4 rounded-xl border text-left transition-all ${segmento === s.id
                                                ? 'border-pirateRed bg-red-50 ring-1 ring-pirateRed text-pirateRedDark'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="font-semibold">{s.label}</div>
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={loadClientes}
                                    disabled={loading}
                                    className="px-6 py-2 bg-pirateRed text-white rounded-lg font-medium hover:bg-pirateRedDark transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? 'Cargando...' : 'Continuar'}
                                    {!loading && <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 & 3: MENSAJE Y EJECUCION */}
                    {(step === 2 || step === 3) && (
                        <div className="space-y-6">

                            {/* Resumen Audiencia */}
                            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-blue-900">Audiencia Seleccionada</p>
                                        <p className="text-xs text-blue-700">{clientes.length} clientes ({segmento})</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep(1)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Cambiar
                                </button>
                            </div>

                            {/* Editor de Mensaje */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">2. Redacta tu mensaje</label>
                                <div className="relative">
                                    <textarea
                                        value={mensaje}
                                        onChange={(e) => setMensaje(e.target.value)}
                                        className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pirateRed focus:border-pirateRed"
                                        placeholder="Escribe tu mensaje aquí..."
                                    />
                                    <div className="absolute bottom-2 right-2 flex gap-2">
                                        <button
                                            onClick={() => setMensaje(m => m + ' [Nombre]')}
                                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border text-gray-600"
                                        >
                                            + Nombre
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Usa <code className="bg-gray-100 px-1 rounded text-red-500">[Nombre]</code> para personalizar automáticamente el mensaje.
                                </p>
                            </div>

                            {/* Preview */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Vista Previa</label>
                                <div className="bg-gray-100 p-4 rounded-lg rounded-tl-none border border-gray-200 text-sm text-gray-800 relative">
                                    <div className="absolute top-0 left-0 bg-white text-[10px] px-2 py-0.5 rounded-br border-b border-r text-gray-400">
                                        WhatsApp
                                    </div>
                                    {getPreview()}
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="border-t pt-6" />

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium text-gray-900">3. Enviar Campaña ({clientes.length})</h3>
                                    <button
                                        onClick={copyToClipboard}
                                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                    >
                                        {copiado ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                        {copiado ? 'Copiado' : 'Copiar Texto Base'}
                                    </button>
                                </div>

                                <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
                                    {clientes.map((cliente) => (
                                        <div key={cliente.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{cliente.nombre}</p>
                                                <p className="text-xs text-gray-500">{cliente.telefono}</p>
                                            </div>
                                            <a
                                                href={generateWhatsAppLink(cliente)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                                            >
                                                <Send className="w-3 h-3" />
                                                Enviar
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                {step > 1 && (
                    <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                            * El envío se hace manualmente uno a uno para evitar bloqueo de WhatsApp.
                        </span>
                        {/* <button className="text-sm text-pirateRed font-medium">Exportar Lista CSV</button> */}
                    </div>
                )}
            </div>
        </div>
    );
}
