/*
  # Fix Remaining Security Issues - Corrected

  1. **Add Missing Foreign Key Indexes (6 tables)**
    - asignaciones_entrega (repartidor_id)
    - insumos (categoria_id)
    - movimientos_puntos (cliente_id)
    - predicciones_consumo (insumo_id)
    - rutas_entrega (repartidor_id)
    - whatsapp_messages (cliente_id)

  2. **Fix RLS Policies with Auth Function Optimization**
    - pedidos (2 policies)
    - usuarios (1 policy)
    - metricas_venta (1 policy with correct vendedor_id column)

  3. **Remove Unused Indexes Created in Previous Migration**
    - Remove 23 indexes that have never been used
    - These indexes add overhead without providing benefit

  ## Performance Impact
  - Foreign key indexes: Improves JOIN and lookup performance
  - RLS optimization: 10-100x performance improvement on large result sets
  - Unused index removal: Reduces write operation overhead
*/

-- ============================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_asignaciones_entrega_repartidor 
ON public.asignaciones_entrega(repartidor_id);

CREATE INDEX IF NOT EXISTS idx_insumos_categoria 
ON public.insumos(categoria_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_puntos_cliente 
ON public.movimientos_puntos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_predicciones_consumo_insumo 
ON public.predicciones_consumo(insumo_id);

CREATE INDEX IF NOT EXISTS idx_rutas_entrega_repartidor 
ON public.rutas_entrega(repartidor_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_cliente 
ON public.whatsapp_messages(cliente_id);

-- ============================================================
-- OPTIMIZE REMAINING RLS POLICIES
-- ============================================================

-- Fix pedidos policies - wrap auth.uid() with SELECT
DROP POLICY IF EXISTS "Permitir a admins gestionar pedidos activos" ON public.pedidos;
CREATE POLICY "Permitir a admins gestionar pedidos activos"
ON public.pedidos
FOR ALL
TO authenticated
USING (deleted_at IS NULL AND (SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir ver pedidos eliminados a admins" ON public.pedidos;
CREATE POLICY "Permitir ver pedidos eliminados a admins"
ON public.pedidos
FOR SELECT
TO authenticated
USING (deleted_at IS NOT NULL AND (SELECT auth.uid()) IS NOT NULL);

-- Fix usuarios policy - assumes usuarios.id matches auth.uid()
DROP POLICY IF EXISTS "Usuarios pueden ver/editar su propia info" ON public.usuarios;
CREATE POLICY "Usuarios pueden ver/editar su propia info"
ON public.usuarios
FOR ALL
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Fix metricas_venta policy - using correct vendedor_id column
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar sus métricas" ON public.metricas_venta;
CREATE POLICY "Usuarios autenticados pueden actualizar sus métricas"
ON public.metricas_venta
FOR ALL
TO authenticated
USING (vendedor_id = (SELECT auth.uid()))
WITH CHECK (vendedor_id = (SELECT auth.uid()));

-- ============================================================
-- REMOVE UNUSED INDEXES FROM PREVIOUS MIGRATION
-- ============================================================

-- These indexes were created but have never been used
-- Removing them reduces overhead on write operations

DROP INDEX IF EXISTS idx_alertas_inventario_insert_by_user;
DROP INDEX IF EXISTS idx_asignaciones_entrega_insert_by_user;
DROP INDEX IF EXISTS idx_cocina_items_detalle_pedido_id;
DROP INDEX IF EXISTS idx_estado_transiciones_estado_destino;
DROP INDEX IF EXISTS idx_finanzas_movimientos_categoria;
DROP INDEX IF EXISTS idx_finanzas_movimientos_movimiento_insumo;
DROP INDEX IF EXISTS idx_finanzas_movimientos_pedido;
DROP INDEX IF EXISTS idx_finanzas_movimientos_proveedor;
DROP INDEX IF EXISTS idx_finanzas_pagos_recurrentes_categoria;
DROP INDEX IF EXISTS idx_movimientos_credito_cliente_cliente;
DROP INDEX IF EXISTS idx_movimientos_credito_cliente_pedido;
DROP INDEX IF EXISTS idx_movimientos_puntos_insert_by_user;
DROP INDEX IF EXISTS idx_movimientos_puntos_pedido;
DROP INDEX IF EXISTS idx_pagos_cobrado_por_usuario;
DROP INDEX IF EXISTS idx_pedidos_cobrado_por_usuario;
DROP INDEX IF EXISTS idx_pedidos_tipo_entrega;
DROP INDEX IF EXISTS idx_pedidos_zona_entrega;
DROP INDEX IF EXISTS idx_produtos_estaciones_estacion;
DROP INDEX IF EXISTS idx_recetas_produto;
DROP INDEX IF EXISTS idx_repartidores_usuario;
DROP INDEX IF EXISTS idx_rol_permisos_permiso;
DROP INDEX IF EXISTS idx_usuarios_rol;
DROP INDEX IF EXISTS idx_whatsapp_messages_template;