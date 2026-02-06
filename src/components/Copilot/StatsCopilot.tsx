import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Terminal, Activity, Settings, Plus, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { formatCurrency } from '../../lib/utils/formatters';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    data?: any[];
    sql?: string;
    timestamp: Date;
}

interface KnowledgeNote {
    id: string;
    content: string;
    created_at: string;
}

const GEMINI_API_KEY = "AIzaSyC7wB46DSqpP6FfX61tt6lPnBE0_uEE56g";

const SYSTEM_PROMPT = `
  Eres un Analista de Datos experto para el restaurante "Piratas". 
  Tu tarea es traducir preguntas del usuario en lenguaje natural a consultas SQL válidas para PostgreSQL.
  
  ESQUEMA REAL DE LA BASE DE DATOS:
  - pedidos_vista (VISTA RECOMENDADA): Contiene (id, total, cliente_nombre, estado_nombre, insert_date, etc.). 
    * Nota: Ya filtra los pedidos eliminados (deleted_at IS NULL).
  - detalles_pedido: Contiene (pedido_id, producto_id, cantidad, precio_unitario, subtotal).
  - productos: Contiene (id, nombre, categoria_id, precio_regular).
  - categorias: Contiene (id, nombre).
  
  VISTAS Y FUNCIONES ÚTILES:
  - v_productos_mas_vendidos: (producto_id, producto_nombre, unidades_vendidas, ingresos_totales).
  - get_productos_top_ventas(p_fecha_inicio::timestamptz, p_fecha_fin::timestamptz, p_limite::int): Ranking de productos.
  
  REGLAS CRÍTICAS:
  1. Solo genera consultas SELECT. NUNCA INSERT, UPDATE o DELETE.
  2. Si el usuario pide PREDICCIONES o TENDENCIAS, obtén datos históricos y realiza la proyección en la explicación.
  3. Si una consulta es muy estricta y sospechas que podría devolver cero resultados (ej. "semana tras semana sin falta"), sugiere en la explicación una forma más flexible de buscar (ej. "clientes con más de 3 compras al mes").
  4. Para ventas de "hoy" usa: insert_date::date = CURRENT_DATE.
  5. Para ventas de "ayer" usa: insert_date::date = CURRENT_DATE - 1.
  6. Para meses: EXTRACT(MONTH FROM insert_date).
  7. Responde ÚNICAMENTE en JSON: {"sql": "consulta", "explanation": "análisis y recomendaciones"}.
  8. NUNCA incluyas punto y coma (;) ni comentarios en el SQL.
`;

export const StatsCopilot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: '¡Listo! Soy tu Copiloto Pirata 2.0. ⚓️ Ya tengo cargada tu nueva energía. ¿Qué quieres saber sobre los datos de Piratas hoy?',
            timestamp: new Date()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchKnowledge = async () => {
        const { data, error } = await supabase
            .from('ai_knowledge_base')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (data) setKnowledgeBase(data);
        if (error) console.error('Error fetching knowledge:', error);
    };

    const addNote = async () => {
        if (!newNote.trim()) return;
        const { error } = await supabase
            .from('ai_knowledge_base')
            .insert([{ content: newNote.trim() }]);

        if (!error) {
            setNewNote('');
            fetchKnowledge();
        }
    };

    const deleteNote = async (id: string) => {
        const { error } = await supabase
            .from('ai_knowledge_base')
            .delete()
            .eq('id', id);

        if (!error) fetchKnowledge();
    };

    useEffect(() => {
        fetchKnowledge();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const knowledgeContext = knowledgeBase.length > 0
                ? `\n\nCONOCIMIENTO ADICIONAL DEL USUARIO (ENTRENAMIENTO):\n${knowledgeBase.map((n, i) => `${i + 1}. ${n.content}`).join('\n')}`
                : '';

            const cleanKey = GEMINI_API_KEY.trim();
            const aiResponseRaw = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${cleanKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${SYSTEM_PROMPT}${knowledgeContext}\n\nPregunta: ${input}\n\nResponde solo el objeto JSON solicitado.` }]
                    }],
                    generationConfig: {
                        response_mime_type: "application/json",
                        temperature: 0.1
                    }
                })
            });

            if (!aiResponseRaw.ok) {
                const errorData = await aiResponseRaw.json().catch(() => ({}));
                throw new Error(`Error API: ${errorData.error?.message || 'Fallo de conexión'}`);
            }

            let currentSql = '';
            try {
                const aiResult = await aiResponseRaw.json();
                const textResponse = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!textResponse) throw new Error('La IA no devolvió respuesta.');

                const startIdx = textResponse.indexOf('{');
                const endIdx = textResponse.lastIndexOf('}');
                if (startIdx === -1 || endIdx === -1) throw new Error('Formato JSON inválido.');

                const aiContent = JSON.parse(textResponse.substring(startIdx, endIdx + 1));
                currentSql = aiContent.sql;

                const { data: sqlData, error: sqlError } = await supabase.rpc('execute_read_only_sql', {
                    sql_query: currentSql
                });

                if (sqlError) throw new Error(sqlError.message);

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: aiContent.explanation,
                    data: sqlData,
                    sql: currentSql,
                    timestamp: new Date()
                }]);
            } catch (err: any) {
                console.error('Error in StatsCopilot:', err);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `🚨 Error: ${err.message} 🏴‍☠️`,
                    sql: currentSql,
                    timestamp: new Date()
                }]);
            }
        } catch (err: any) {
            console.error('External error:', err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `🚨 Error Crítico: ${err.message} 🏴‍☠️`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Botón Flotante */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-pirateRed to-pirateRedDark text-white shadow-2xl shadow-pirateRed/30 flex items-center justify-center transition-all duration-500 z-40 hover:scale-110 active:scale-95 ${isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
            >
                <Sparkles className="w-6 h-6 animate-pulse" />
            </button>

            {/* Panel de Chat */}
            <div className={`fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden transition-all duration-500 z-50 border border-gray-100 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none translate-y-10'}`}>

                {/* Header */}
                <div className="bg-gradient-to-br from-gray-900 to-black p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-pirateRed flex items-center justify-center shadow-lg shadow-pirateRed/20">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-pirateRed">Copilot AI</h3>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Conectado a Bodega</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsTrainingMode(!isTrainingMode)}
                            className={`p-2 rounded-xl transition-all ${isTrainingMode ? 'bg-pirateRed text-white' : 'hover:bg-white/10 text-gray-400'}`}
                            title={isTrainingMode ? "Volver al Chat" : "Entrenar IA"}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body: Chat or Training */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {isTrainingMode ? (
                        <div className="flex-1 flex flex-col p-6 bg-gray-50 overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen className="w-4 h-4 text-pirateRed" />
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Base de Conocimientos</h4>
                            </div>

                            {/* Formulario */}
                            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Escribe algo que la IA deba saber (ej: 'La tabla X tiene los costos')"
                                    className="w-full text-xs bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-pirateRed/10 min-h-[80px] outline-none"
                                />
                                <button
                                    onClick={addNote}
                                    disabled={!newNote.trim()}
                                    className="w-full mt-3 py-3 bg-pirateRed text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" /> Añadir Conocimiento
                                </button>
                            </div>

                            {/* Lista de Notas */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                                {knowledgeBase.map((note) => (
                                    <div key={note.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm group">
                                        <div className="flex justify-between gap-3">
                                            <p className="text-xs text-gray-600 leading-relaxed">{note.content}</p>
                                            <button
                                                onClick={() => deleteNote(note.id)}
                                                className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-gray-50/50">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-pirateRed text-white rounded-tr-none font-medium'
                                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}
                                        >
                                            {msg.content}
                                        </div>

                                        {/* Visualización de Datos (si hay) */}
                                        {msg.data && (
                                            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-lg mt-2">
                                                <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resultado</span>
                                                    <Activity className="w-3 h-3 text-pirateRed" />
                                                </div>
                                                {msg.data.length > 0 ? (
                                                    <div className="max-h-[200px] overflow-auto">
                                                        <table className="w-full text-[10px] border-collapse">
                                                            <thead className="sticky top-0 bg-gray-50">
                                                                <tr>
                                                                    {Object.keys(msg.data[0]).map(key => (
                                                                        <th key={key} className="p-2 text-left text-gray-400 font-bold border-b border-gray-100 capitalize">{key.replace('_', ' ')}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {msg.data.map((row, i) => (
                                                                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                                        {Object.values(row).map((val: any, j) => (
                                                                            <td key={j} className="p-2 text-gray-600">
                                                                                {typeof val === 'number' && val > 100 ? formatCurrency(val) : String(val)}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="p-8 text-center">
                                                        <p className="text-xs text-gray-400 italic">No se encontraron registros que coincidan con estos criterios. 🏴‍☠️</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* SQL Toggle (Debug/Info) */}
                                        {msg.sql && (
                                            <details className="mt-1 group">
                                                <summary className="text-[9px] text-gray-400 font-bold uppercase tracking-widest cursor-pointer hover:text-pirateRed transition-colors flex items-center gap-1 list-none">
                                                    <Terminal className="w-2.5 h-2.5" /> Ver Consulta Técnica
                                                </summary>
                                                <div className="mt-2 p-3 bg-gray-900 rounded-xl text-[10px] text-green-400 font-mono overflow-x-auto border border-white/5">
                                                    {msg.sql}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-pirateRed rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-pirateRed rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-pirateRed rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium italic">Navegando datos...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-6 bg-white border-t border-gray-100">
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribe tu pregunta aquí..."
                            className="w-full pl-5 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm focus:bg-white focus:border-pirateRed/20 focus:ring-4 focus:ring-pirateRed/5 transition-all outline-none"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-pirateRed text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-[9px] text-center text-gray-400 mt-3 font-bold uppercase tracking-widest italic opacity-50">
                        Inteligencia Artificial Experimental para Piratas
                    </p>
                </div>
            </div>
        </>
    );
};
