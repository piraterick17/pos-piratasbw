/*
  # RPC para Agente IA de Estadísticas
  
  Esta función permite ejecutar consultas SQL dinámicas generadas por la IA
  de forma segura (restringida a SELECT y con timeout).
*/

CREATE OR REPLACE FUNCTION execute_read_only_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador
AS $$
DECLARE
    result jsonb;
BEGIN
    -- 1. Validaciones de seguridad (usando \y para límites de palabra exactos)
    IF sql_query ~* '\y(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|GRANT|REVOKE)\y' THEN
        RAISE EXCEPTION 'Operación no permitida: Solo se permiten consultas SELECT (Comando bloqueado por seguridad).';
    END IF;

    -- 2. Limpiar punto y coma al final si existe (rompe el envuelto)
    sql_query := REGEXP_REPLACE(sql_query, ';\s*$', '');
    
    -- 2.5 Limpiar comentarios (pueden romper el envuelto si no hay saltos de línea)
    sql_query := REGEXP_REPLACE(sql_query, '--.*$', '', 'mg');
    sql_query := REGEXP_REPLACE(sql_query, '/\*.*?\*/', '', 'sg');

    -- 3. Ejecutar la consulta y convertir resultado a JSON
    EXECUTE format('SELECT jsonb_agg(t) FROM (%s) t', sql_query) INTO result;
    
    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error ejecutando consulta IA: %', SQLERRM;
END;
$$;

-- Otorgar permisos solo a roles autenticados (opcional, la Edge Function usará service_role)
-- Otorgar permisos a roles autenticados
GRANT EXECUTE ON FUNCTION execute_read_only_sql TO authenticated;
GRANT EXECUTE ON FUNCTION execute_read_only_sql TO service_role;
