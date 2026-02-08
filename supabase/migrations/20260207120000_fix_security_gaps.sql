/*
  # Security Fixes

  1.  **WhatsApp Config**: Restrict access to 'Administrador' role only.
  2.  **Copilot SQL**: Change `execute_read_only_sql` to `SECURITY INVOKER`.
*/

-- 1. Secure WhatsApp Config
DROP POLICY IF EXISTS "Anyone can view whatsapp config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp config" ON public.whatsapp_config;

CREATE POLICY "Admins can view whatsapp config"
  ON public.whatsapp_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_roles ur
      JOIN public.roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre = 'Administrador'
    )
  );

CREATE POLICY "Admins can manage whatsapp config"
  ON public.whatsapp_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuario_roles ur
      JOIN public.roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuario_roles ur
      JOIN public.roles r ON r.id = ur.rol_id
      WHERE ur.usuario_id = auth.uid()
        AND ur.activo = true
        AND r.nombre = 'Administrador'
    )
  );

-- 2. Secure Copilot SQL Function
-- Re-create function with SECURITY INVOKER (drops existing function first if signature matches, but OR REPLACE covers it)
CREATE OR REPLACE FUNCTION public.execute_read_only_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- CHANGED FROM DEFINER TO INVOKER
AS $$
DECLARE
    result jsonb;
BEGIN
    -- 1. Security Validations
    IF sql_query ~* '\y(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\y' THEN
        RAISE EXCEPTION 'Operación no permitida: Solo se permiten consultas SELECT (Comando bloqueado por seguridad).';
    END IF;

    -- 2. Clean trailing semicolon
    sql_query := REGEXP_REPLACE(sql_query, ';\s*$', '');
    
    -- 2.5 Clean comments
    sql_query := REGEXP_REPLACE(sql_query, '--.*$', '', 'mg');
    sql_query := REGEXP_REPLACE(sql_query, '/\*.*?\*/', '', 'sg');

    -- 3. Execute query
    EXECUTE format('SELECT jsonb_agg(t) FROM (%s) t', sql_query) INTO result;
    
    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error ejecutando consulta IA: %', SQLERRM;
END;
$$;
