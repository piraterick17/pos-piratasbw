import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Static Schema (compact — column names only) ────────────────────────
const DB_SCHEMA = `
ESQUEMA DE BD — Restaurante "Los Piratas B&W"

## pedidos_vista (vista principal de pedidos)
id, cliente_id, estado_id, subtotal, descuentos, impuestos, total, notas,
deleted_at (null=activo), insert_date (timestamptz), updated_at, fecha_finalizacion,
tipo_entrega_id, zona_entrega_id, costo_envio, direccion_envio, notas_entrega,
estado_nombre, estado_color, cliente_nombre, cliente_telefono,
tipo_entrega_nombre ("A domicilio"/"Para llevar"/"Comer aquí")

## detalles_pedido
id, pedido_id (FK→pedidos), producto_id (FK→productos), cantidad, precio_unitario, subtotal

## productos
id, nombre, categoria_id (FK→categorias), precio_regular, descripcion, activo

## categorias
id, nombre, active

## clientes
id, nombre, telefono, email, direccion, notas, total_pedidos, total_gastado, ultima_visita

## pagos
id, pedido_id (FK→pedidos), monto, metodo_pago ("Efectivo"/"Tarjeta"/"Transferencia"), insert_date

## tipos_entrega
id, nombre ("A domicilio"/"Para llevar"/"Comer aquí")

## zonas_entrega
id, nombre, costo, activa

## finanzas_movimientos
id, tipo ("ingreso"/"egreso"), monto, descripcion, categoria_id (FK→finanzas_categorias_gastos),
pedido_id, proveedor_id, fecha_movimiento, estatus ("pagado"/"pendiente"/"cancelado"), metodo_pago, deleted_at

## finanzas_categorias_gastos
id, nombre, descripcion

## finanzas_pagos_recurrentes
id, descripcion, monto, categoria_id, frecuencia ("diario"/"semanal"/"mensual"/"anual"), dia_del_mes, fecha_inicio, fecha_fin, activo

## finanzas_cuentas_por_pagar
id, proveedor_id, monto_total, monto_pagado, saldo_pendiente, fecha_factura, fecha_vencimiento, estatus ("pendiente"/"pagado_parcial"/"pagado_completo"/"vencido"), descripcion

## insumos
id, nombre, categoria_id, unidad_medida, stock_actual, stock_minimo, costo_unitario, activo

## proveedores
id, nombre, contacto_nombre, telefono, email, activo
`;

// ─── Build System Prompt with dynamic context ───────────────────────────
function buildSystemPrompt(dynamicContext: string, currentDate: string, knowledgeContext: string): string {
    return `
Eres el Copilot IA del restaurante "Los Piratas B&W". Eres un asistente de negocios experto, 
amigable y conciso. Respondes SIEMPRE en español.

${DB_SCHEMA}

${dynamicContext}

${knowledgeContext}

DEFINICIONES DE NEGOCIO:
- "Turno Matutino": Pedidos 08:00–12:00 hora México. SQL: EXTRACT(HOUR FROM timezone('America/Mexico_City', insert_date)) BETWEEN 8 AND 11
- "Turno Vespertino": Pedidos 12:00–18:00 hora México.
- "Turno Nocturno": Pedidos 18:00–23:00 hora México.
- Para buscar un producto por nombre: p.nombre ILIKE '%término%'
- Para buscar por categoría: c.nombre ILIKE '%término%' (usa la tabla categorias con alias c)
- Tipos de entrega: "A domicilio", "Para llevar", "Comer aquí"
- Métodos de pago: "Efectivo", "Tarjeta", "Transferencia"
- Ticket promedio = SUM(total) / COUNT(*)
- "Ventas" = pedidos Completado o En Reparto (excluye Cancelado/Anulado/Nuevo/Pendiente)

EJEMPLOS (SIGUE EXACTAMENTE ESTE PATRÓN):

P: ¿Cuánto vendí hoy?
R: {"type":"sql","sql":"SELECT COALESCE(SUM(total),0) AS total FROM pedidos_vista WHERE estado_nombre IN ('Completado','En Reparto') AND deleted_at IS NULL AND timezone('America/Mexico_City',insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date","template":"Hoy llevas **$[[total]]** en ventas 💰"}

P: ¿Cuántos pedidos tuve ayer?
R: {"type":"sql","sql":"SELECT COUNT(*) AS total_pedidos FROM pedidos_vista WHERE estado_nombre IN ('Completado','En Reparto') AND deleted_at IS NULL AND timezone('America/Mexico_City',insert_date)::date = ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date - INTERVAL '1 day')::date","template":"Ayer registraste **[[total_pedidos]] pedidos** 📋"}

P: ¿Cuál es mi ticket promedio de hoy?
R: {"type":"sql","sql":"SELECT COALESCE(ROUND(AVG(total)::numeric,2),0) AS ticket_promedio FROM pedidos_vista WHERE estado_nombre IN ('Completado','En Reparto') AND deleted_at IS NULL AND timezone('America/Mexico_City',insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date","template":"Tu ticket promedio hoy es de **$[[ticket_promedio]]** 🎫"}

P: ¿Cuánto vendí de hamburguesas hoy?
R: {"type":"sql","sql":"SELECT COALESCE(SUM(dp.subtotal),0) AS total FROM detalles_pedido dp JOIN productos p ON dp.producto_id=p.id JOIN categorias c ON p.categoria_id=c.id JOIN pedidos_vista pv ON dp.pedido_id=pv.id WHERE c.nombre ILIKE '%hamburguesa%' AND pv.estado_nombre IN ('Completado','En Reparto') AND pv.deleted_at IS NULL AND timezone('America/Mexico_City',pv.insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date","template":"Hoy vendiste **$[[total]]** en hamburguesas 🍔"}

P: ¿Cuál es mi producto estrella hoy?
R: {"type":"sql","sql":"SELECT string_agg(nombre || ': ' || total::text, E'\\n') AS lista FROM (SELECT p.nombre, SUM(dp.cantidad) AS total FROM detalles_pedido dp JOIN productos p ON dp.producto_id=p.id JOIN pedidos_vista pv ON dp.pedido_id=pv.id WHERE pv.estado_nombre IN ('Completado','En Reparto') AND pv.deleted_at IS NULL AND timezone('America/Mexico_City',pv.insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date GROUP BY p.nombre ORDER BY total DESC LIMIT 5) sub","template":"**🌟 Top 5 productos hoy:**\\n[[lista]]"}

P: ¿Cuántos pedidos a domicilio hubo hoy?
R: {"type":"sql","sql":"SELECT COUNT(*) AS total, COALESCE(SUM(total),0) AS monto FROM pedidos_vista WHERE tipo_entrega_nombre='A domicilio' AND estado_nombre IN ('Completado','En Reparto') AND deleted_at IS NULL AND timezone('America/Mexico_City',insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date","template":"Hoy tuviste **[[total]] pedidos a domicilio** por **$[[monto]]** 🛵"}

P: ¿Cuánto pagaron con tarjeta hoy?
R: {"type":"sql","sql":"SELECT COALESCE(SUM(pa.monto),0) AS total FROM pagos pa JOIN pedidos_vista pv ON pa.pedido_id=pv.id WHERE pa.metodo_pago='Tarjeta' AND pv.deleted_at IS NULL AND timezone('America/Mexico_City',pv.insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date","template":"Hoy recibiste **$[[total]]** en pagos con tarjeta 💳"}

P: ¿Cuánto gasté este mes?
R: {"type":"sql","sql":"SELECT COALESCE(SUM(monto),0) AS total_gastos FROM finanzas_movimientos WHERE tipo='egreso' AND estatus='pagado' AND (anulado IS NULL OR anulado=false) AND date_trunc('month',fecha_movimiento::date) = date_trunc('month',(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date)","template":"Este mes llevas **$[[total_gastos]]** en gastos 💸"}

P: ¿Cuánto debo a proveedores?
R: {"type":"sql","sql":"SELECT COALESCE(SUM(saldo_pendiente),0) AS total_deuda, COUNT(*) AS num_cuentas FROM finanzas_cuentas_por_pagar WHERE estatus='pendiente'","template":"Tienes **[[num_cuentas]] cuentas pendientes** por un total de **$[[total_deuda]]** 📄"}

P: ¿Quién es mi mejor cliente?
R: {"type":"sql","sql":"SELECT nombre, total_gastado, total_pedidos FROM clientes WHERE deleted_at IS NULL AND total_gastado > 0 ORDER BY total_gastado DESC LIMIT 1","template":"Tu mejor cliente es **[[nombre]]** con **$[[total_gastado]]** gastados en **[[total_pedidos]] pedidos** 👑"}

P: ¿Qué insumos están bajos de stock?
R: {"type":"sql","sql":"SELECT string_agg(nombre || ' (' || stock_actual::text || '/' || stock_minimo::text || ' ' || unidad_medida || ')', E'\\n') AS lista FROM insumos WHERE stock_actual <= stock_minimo AND stock_minimo > 0","template":"**⚠️ Insumos con stock bajo:**\\n[[lista]]"}

P: ¿Cuánto vendí esta semana vs la pasada?
R: {"type":"sql","sql":"SELECT COALESCE(SUM(CASE WHEN timezone('America/Mexico_City',insert_date)::date >= date_trunc('week',(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date) THEN total END),0) AS esta_semana, COALESCE(SUM(CASE WHEN timezone('America/Mexico_City',insert_date)::date >= (date_trunc('week',(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date) - INTERVAL '7 days') AND timezone('America/Mexico_City',insert_date)::date < date_trunc('week',(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date) THEN total END),0) AS semana_pasada FROM pedidos_vista WHERE estado_nombre IN ('Completado','En Reparto') AND deleted_at IS NULL","template":"**Esta semana:** $[[esta_semana]]\\n**Semana pasada:** $[[semana_pasada]] 📊"}

P: Hola, ¿cómo estás?
R: {"type":"chat","response":"¡Ahoy! 🏴‍☠️ Estoy listo para ayudarte con datos de tu negocio. ¿Qué necesitas saber?"}

INSTRUCCIONES DE RESPUESTA:

Cuando el usuario pida datos, responde con JSON:
{"type": "sql", "sql": "SELECT ...", "template": "Texto con [[placeholders]] para cada columna del resultado"}

Cuando NO se necesite SQL (saludos, consejos, preguntas generales):
{"type": "chat", "response": "Tu respuesta amigable con **markdown**."}

REGLAS PARA EL TEMPLATE (MUY IMPORTANTE):
1. El template es tu respuesta final al usuario. Usa markdown: **negritas**, emojis, listas.
2. Usa [[nombre_columna]] para insertar valores del resultado SQL. Los placeholders se sustituirán automáticamente.
3. Si el SELECT tiene alias (ej: SUM(total) AS total_ventas), usa [[total_ventas]] en el template.
4. Para montos de dinero, agrega el signo $ antes: $[[total_ventas]]
5. El template debe sonar natural y conversacional, como si ya tuvieras los datos.
6. Si el query puede retornar múltiples filas, tu template se aplicará a la primera fila solamente. Para listas, usa un alias descriptivo.
7. Si quisieras mostrar una lista de resultados (ej: top 5 productos), genera SQL que retorne UNA fila con las columnas concatenadas:
   Ejemplo: SELECT string_agg(nombre || ': ' || cantidad::text, ', ') AS lista FROM (subquery) sub

REGLAS SQL CRÍTICAS:
1. Solo SELECT, NUNCA INSERT/UPDATE/DELETE.
2. SIEMPRE filtra deleted_at IS NULL en pedidos/pedidos_vista.
3. Para ventas/ingresos: estado_nombre IN ('Completado', 'En Reparto'). Excluye Nuevo, Pendiente, Cancelado, Anulado.
4. Para "hoy": timezone('America/Mexico_City', insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date
5. Para "ayer": timezone('America/Mexico_City', insert_date)::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date - 1
6. Para "esta semana": timezone('America/Mexico_City', insert_date)::date >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date
7. Para "este mes": timezone('America/Mexico_City', insert_date)::date >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Mexico_City')::date
8. NUNCA punto y coma (;) ni comentarios SQL (--).
9. Usa COALESCE(SUM(...), 0) para evitar null.
10. Responde ÚNICAMENTE con el JSON, nada más.

FECHA/HORA ACTUAL (MÉXICO): ${currentDate}
`;
}

// ─── Types ─────────────────────────────────────────────────────────────
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface RequestBody {
    messages: ChatMessage[];
    knowledgeBase?: string[];
}

// ─── Main Handler ──────────────────────────────────────────────────────
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { messages, knowledgeBase } = await req.json() as RequestBody
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
        if (!messages || messages.length === 0) throw new Error('No messages provided')

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        // ── Step 1: Load dynamic context from DB ──────────────────────
        let dynamicContext = '';
        try {
            const [categoriasRes, productosRes, estadosRes] = await Promise.all([
                supabase.from('categorias').select('id, nombre').eq('active', true),
                supabase.from('productos').select('nombre, categoria_id, precio_regular').eq('activo', true).order('nombre').limit(80),
                supabase.rpc('execute_read_only_sql', {
                    sql_query: "SELECT DISTINCT estado_nombre FROM pedidos_vista WHERE estado_nombre IS NOT NULL"
                })
            ]);

            const categoriasList = (categoriasRes.data || []).map((c: any) => `${c.nombre} (id:${c.id})`).join(', ');
            const productosList = (productosRes.data || []).map((p: any) => p.nombre).join(', ');
            const estadosList = (estadosRes.data || []).map((e: any) => e.estado_nombre).join(', ');

            dynamicContext = `
CONTEXTO DINÁMICO (datos reales del negocio):
- Categorías activas: ${categoriasList || 'Sin datos'}
- Estados de pedido: ${estadosList || 'Sin datos'}
- Productos en menú: ${productosList || 'Sin datos'}
`;
        } catch (ctxErr) {
            console.error('Dynamic context loading failed:', ctxErr);
            dynamicContext = '\nCONTEXTO DINÁMICO: No disponible (error de carga).';
        }

        // ── Step 2: Build prompts ─────────────────────────────────────
        const currentDate = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour12: true });

        let knowledgeContext = '';
        if (knowledgeBase && knowledgeBase.length > 0) {
            knowledgeContext = `\nCONOCIMIENTO ADICIONAL:\n${knowledgeBase.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
        }

        const fullSystemPrompt = buildSystemPrompt(dynamicContext, currentDate, knowledgeContext);

        // ── Step 3: Call Gemini (single pass) ─────────────────────────
        const geminiContents = [];

        geminiContents.push({
            role: 'user',
            parts: [{ text: fullSystemPrompt }]
        });
        geminiContents.push({
            role: 'model',
            parts: [{ text: '{"type": "chat", "response": "¡Entendido! Estoy listo para ayudarte con los datos de Los Piratas. 🏴‍☠️"}' }]
        });

        // Add conversation history (last 20 messages)
        const recentMessages = messages.slice(-20);
        for (const msg of recentMessages) {
            geminiContents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }

        const aiResponseRaw = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: geminiContents,
                    generationConfig: {
                        response_mime_type: "application/json",
                        temperature: 0.3
                    }
                })
            }
        );

        if (!aiResponseRaw.ok) {
            const errorData = await aiResponseRaw.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${errorData.error?.message || aiResponseRaw.statusText}`);
        }

        const aiResult = await aiResponseRaw.json();
        const textResponse = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) throw new Error('Empty response from AI');

        // ── Step 4: Parse response ────────────────────────────────────
        const startIdx = textResponse.indexOf('{');
        const endIdx = textResponse.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) throw new Error('Invalid JSON from AI');

        const aiContent = JSON.parse(textResponse.substring(startIdx, endIdx + 1));

        // ── Step 5: If SQL, execute and fill template ─────────────────
        if (aiContent.type === 'sql' && aiContent.sql) {
            const { data, error } = await supabase.rpc('execute_read_only_sql', {
                sql_query: aiContent.sql
            });

            if (error) {
                return new Response(JSON.stringify({
                    type: 'chat',
                    response: `No pude consultar eso. **Error**: ${error.message}\n\nIntenta reformular tu pregunta. 🏴‍☠️`
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Fill template with actual data values
            let finalResponse = aiContent.template || aiContent.response || 'No encontré datos.';

            if (data && data.length > 0) {
                const firstRow = data[0];
                for (const [key, value] of Object.entries(firstRow)) {
                    const placeholder = `[[${key}]]`;
                    let displayValue = String(value ?? '0');

                    // Format numbers as currency if they look like money amounts
                    if (typeof value === 'number' && value >= 1) {
                        displayValue = new Intl.NumberFormat('es-MX', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                        }).format(value);
                    }

                    finalResponse = finalResponse.split(placeholder).join(displayValue);
                }
            } else {
                // No data — clean up any remaining placeholders
                finalResponse = finalResponse.replace(/\[\[[^\]]+\]\]/g, '0');
            }

            return new Response(JSON.stringify({
                type: 'chat',
                response: finalResponse
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Chat mode — just return text ──────────────────────────────
        return new Response(JSON.stringify({
            type: 'chat',
            response: aiContent.response
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Stats Agent Error:', error);
        return new Response(JSON.stringify({
            type: 'chat',
            response: `⚠️ Ocurrió un error: ${error.message}`,
            error: true
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
})
