import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Settings, Plus, Trash2, BookOpen, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface KnowledgeNote {
    id: string;
    content: string;
    created_at: string;
}

// ─── Simple Markdown Renderer ──────────────────────────────────────────
const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
        // Headers
        if (line.startsWith('### ')) {
            elements.push(<h4 key={lineIdx} className="font-bold text-gray-800 text-xs mt-3 mb-1">{renderInline(line.slice(4))}</h4>);
            return;
        }
        if (line.startsWith('## ')) {
            elements.push(<h3 key={lineIdx} className="font-bold text-gray-800 text-sm mt-3 mb-1">{renderInline(line.slice(3))}</h3>);
            return;
        }
        if (line.startsWith('# ')) {
            elements.push(<h2 key={lineIdx} className="font-bold text-gray-800 text-base mt-3 mb-1">{renderInline(line.slice(2))}</h2>);
            return;
        }

        // Bullet list items
        if (line.match(/^[\-\*]\s/)) {
            elements.push(
                <div key={lineIdx} className="flex gap-1.5 ml-1 my-0.5">
                    <span className="text-pirateRed mt-0.5 text-xs">•</span>
                    <span className="text-xs leading-relaxed">{renderInline(line.slice(2))}</span>
                </div>
            );
            return;
        }

        // Numbered list items
        if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+)\.\s(.*)$/);
            if (match) {
                elements.push(
                    <div key={lineIdx} className="flex gap-1.5 ml-1 my-0.5">
                        <span className="text-pirateRed font-bold text-xs min-w-[16px]">{match[1]}.</span>
                        <span className="text-xs leading-relaxed">{renderInline(match[2])}</span>
                    </div>
                );
                return;
            }
        }

        // Empty line
        if (line.trim() === '') {
            elements.push(<div key={lineIdx} className="h-2" />);
            return;
        }

        // Regular paragraph
        elements.push(<p key={lineIdx} className="text-xs leading-relaxed my-0.5">{renderInline(line)}</p>);
    });

    return <>{elements}</>;
};

// Inline markdown: **bold**, *italic*, `code`, emojis
const renderInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    // Match **bold**, *italic*, `code`
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        if (match[2]) {
            // **bold**
            parts.push(<strong key={match.index} className="font-bold text-gray-900">{match[2]}</strong>);
        } else if (match[3]) {
            // *italic*
            parts.push(<em key={match.index} className="italic">{match[3]}</em>);
        } else if (match[4]) {
            // `code`
            parts.push(<code key={match.index} className="bg-gray-100 text-pirateRed px-1 py-0.5 rounded text-[10px] font-mono">{match[4]}</code>);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
};


export const StatsCopilot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: '¡Ahoy! 🏴‍☠️ Soy tu **Copilot Pirata**, tu asistente de datos con IA.\n\nPuedo ayudarte con:\n- 📊 **Consultar datos**: _"¿Cuánto vendí hoy?"_\n- 🔍 **Análisis**: _"¿Cuál es mi producto estrella?"_\n- 💡 **Consejos**: _"¿Cómo puedo mejorar mis ventas?"_\n- 💬 **Conversación natural**: Puedes hacer seguimiento de cualquier pregunta.\n\n¿En qué te ayudo?',
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
            // Build conversation history for the Edge Function
            // Include all messages (except the initial greeting) for context
            const allMessages = [...messages.filter(m => m.id !== '1'), userMessage];
            const conversationHistory = allMessages.map(m => ({
                role: m.role,
                content: m.role === 'assistant'
                    ? m.content  // Send the text response for context
                    : m.content
            }));

            // Knowledge base as array of strings
            const knowledgeStrings = knowledgeBase.map(n => n.content);

            // Call Edge Function instead of Gemini directly
            const { data, error } = await supabase.functions.invoke('stats-agent', {
                body: {
                    messages: conversationHistory,
                    knowledgeBase: knowledgeStrings.length > 0 ? knowledgeStrings : undefined
                }
            });

            if (error) throw new Error(error.message || 'Error calling AI');

            const response = data;

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: response.response || 'No obtuve una respuesta clara. Intenta de nuevo.',
                timestamp: new Date()
            }]);

        } catch (err: any) {
            console.error('Copilot error:', err);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ **Error**: ${err.message}\n\nIntenta reformular tu pregunta. 🏴‍☠️`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearConversation = () => {
        setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: '🧹 Conversación limpia. ¿En qué te ayudo ahora?',
            timestamp: new Date()
        }]);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-pirateRed to-pirateRedDark text-white shadow-2xl shadow-pirateRed/30 flex items-center justify-center transition-all duration-500 z-40 hover:scale-110 active:scale-95 ${isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}`}
            >
                <Sparkles className="w-6 h-6 animate-pulse" />
            </button>

            {/* Chat Panel */}
            <div className={`fixed bottom-6 right-6 w-[420px] max-w-[calc(100vw-3rem)] h-[650px] max-h-[calc(100vh-6rem)] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden transition-all duration-500 z-50 border border-gray-100 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none translate-y-10'}`}>

                {/* Header */}
                <div className="bg-gradient-to-br from-gray-900 to-black p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pirateRed to-pirateRedDark flex items-center justify-center shadow-lg shadow-pirateRed/30">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-pirateRed">Copilot AI</h3>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Gemini 2.5 · Piratas</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={clearConversation}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                            title="Nueva conversación"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsTrainingMode(!isTrainingMode)}
                            className={`p-2 rounded-xl transition-all ${isTrainingMode ? 'bg-pirateRed text-white' : 'hover:bg-white/10 text-gray-400'}`}
                            title={isTrainingMode ? "Volver al Chat" : "Base de Conocimiento"}
                        >
                            <Settings className="w-4 h-4" />
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

                            {/* Form */}
                            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm mb-6">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Escribe algo que la IA deba saber (ej: 'Los chilaquiles son nuestro producto estrella del desayuno')"
                                    className="w-full text-xs bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-pirateRed/10 min-h-[80px] outline-none resize-none"
                                />
                                <button
                                    onClick={addNote}
                                    disabled={!newNote.trim()}
                                    className="w-full mt-3 py-3 bg-pirateRed text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" /> Añadir Conocimiento
                                </button>
                            </div>

                            {/* Notes List */}
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                                {knowledgeBase.length === 0 && (
                                    <div className="text-center py-8">
                                        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs text-gray-400">Sin conocimiento adicional todavía.</p>
                                        <p className="text-[10px] text-gray-300 mt-1">Agrega notas para que la IA las use como contexto.</p>
                                    </div>
                                )}
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
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide bg-gray-50/50">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-4 rounded-3xl shadow-sm ${msg.role === 'user'
                                            ? 'bg-pirateRed text-white rounded-tr-none font-medium text-sm'
                                            : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'}`}
                                        >
                                            {msg.role === 'assistant'
                                                ? renderMarkdown(msg.content)
                                                : msg.content
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-pirateRed rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-pirateRed rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-pirateRed rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium italic">Analizando...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                {!isTrainingMode && (
                    <div className="p-5 bg-white border-t border-gray-100">
                        <div className="relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder="Pregunta lo que quieras..."
                                className="w-full pl-5 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm focus:bg-white focus:border-pirateRed/20 focus:ring-4 focus:ring-pirateRed/5 transition-all outline-none"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-pirateRed text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-[9px] text-center text-gray-300 mt-3 font-bold uppercase tracking-widest">
                            Gemini 2.5 · Conversación con memoria
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};
