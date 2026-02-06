-- =================================================================
-- SISTEMA DE ENTRENAMIENTO PARA EL AGENTE IA (KNOWLEDGE BASE)
-- Permite al usuario dar contexto personalizado a la IA.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "Permitir gestión a usuarios autenticados" ON public.ai_knowledge_base;

CREATE POLICY "Permitir lectura a usuarios autenticados" 
ON public.ai_knowledge_base FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir gestión a usuarios autenticados" 
ON public.ai_knowledge_base FOR ALL 
USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_knowledge_updated_at
    BEFORE UPDATE ON public.ai_knowledge_base
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
