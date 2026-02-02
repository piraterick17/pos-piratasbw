-- ======================================================
-- AÑADIR SOPORTE PARA SOFT DELETES EN CLIENTES
-- ======================================================

-- 1. Añadir la columna para el borrado lógico
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Actualizar las políticas de seguridad
-- La política de lectura normal ahora solo debe devolver clientes NO eliminados.
DROP POLICY IF EXISTS "Permitir gestión de clientes a usuarios autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Permitir a usuarios autenticados ver clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir a usuarios autenticados ver clientes activos" ON public.clientes;
DROP POLICY IF EXISTS "Permitir a admins ver todos los clientes (incluidos eliminados)" ON public.clientes;

-- Política principal para usuarios autenticados (solo clientes activos)
CREATE POLICY "Permitir gestión de clientes activos a usuarios autenticados" ON public.clientes
FOR ALL USING (auth.role() = 'authenticated' AND deleted_at IS NULL);

-- Política adicional para que los usuarios puedan ver clientes eliminados cuando sea necesario
CREATE POLICY "Permitir ver clientes eliminados a usuarios autenticados" ON public.clientes
FOR SELECT USING (auth.role() = 'authenticated');