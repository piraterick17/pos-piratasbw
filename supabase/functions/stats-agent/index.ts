import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { query } = await req.json()
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        // 1. Construir el System Prompt con el esquema de la DB
        const systemPrompt = `
      Eres un Analista de Datos experto para el restaurante "Piratas". 
      Tu tarea es traducir preguntas del usuario en lenguaje natural a consultas SQL válidas para PostgreSQL.
      
      ESQUEMA DE TABLAS:
      - pedidos (id: uuid, total: numeric, cliente_nombre: text, m_id_metodo_pago: int, insert_date: timestamptz, deleted_at: timestamptz)
      - detalles_pedido (id: uuid, pedido_id: uuid, producto_id: uuid, cantidad: int, precio_unitario: numeric)
      - productos (id: uuid, nombre: text, categoria_id: int, precio_regular: numeric)
      - categorias (id: int, nombre: text)
      
      REGLAS CRÍTICAS:
      1. Solo genera consultas SELECT. NUNCA generes INSERT, UPDATE o DELETE.
      2. Siempre filtra por "deleted_at IS NULL" en la tabla pedidos.
      3. Si te piden ventas totales, suma la columna "total" de pedidos.
      4. Responde ÚNICAMENTE con el objeto JSON: {"sql": "consulta sql", "explanation": "breve explicación"}.
      5. No incluyas markdown o bloques de código en tu respuesta, solo el JSON puro.
      6. La zona horaria es America/Mexico_City.
    `

        // 2. Llamar a Gemini para generar el SQL
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\nPregunta: ${query}` }]
                }],
                generationConfig: { response_mime_type: "application/json" }
            })
        })

        const result = await response.json()
        const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text)

        // 3. Ejecutar el SQL generado de forma segura
        const { data, error } = await supabase.rpc('execute_read_only_sql', { sql_query: aiResponse.sql })

        if (error) throw error

        return new Response(JSON.stringify({
            answer: aiResponse.explanation,
            data: data,
            sql: aiResponse.sql
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
