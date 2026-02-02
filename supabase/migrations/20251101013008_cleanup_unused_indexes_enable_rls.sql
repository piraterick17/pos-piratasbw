/*
  # Fix Security Issues - Part 3: Remove Unused Indexes & Enable RLS

  1. **Remove Unused Indexes (28 indexes)**
    - Removes indexes that have never been used
    - Frees up storage space
    - Reduces overhead on INSERT/UPDATE/DELETE operations
    - Improves write performance

  2. **Enable RLS on Public Tables**
    - Enables RLS on roles, rol_permisos, and permisos tables
    - Adds appropriate policies for authenticated users
    - Ensures proper security on permission tables

  ## Tables Affected by Index Removal
    - cocina_items, detalles_pedido, insumos, movimientos_stock
    - pagos, pedidos, productos, proveedor_insumos, proveedores
    - tickets, predicciones_consumo, movimientos_puntos
    - repartidores, asignaciones_entrega, rutas_entrega
    - notificaciones, whatsapp_messages, categorias

  ## Note
  - Indexes can be recreated if needed later
  - Monitoring will show if they become necessary
*/

-- ============================================================
-- REMOVE UNUSED INDEXES
-- ============================================================

-- cocina_items
DROP INDEX IF EXISTS idx_cocina_items_prioridad;
DROP INDEX IF EXISTS idx_cocina_items_created;

-- detalles_pedido  
DROP INDEX IF EXISTS idx_detalles_pedido_deleted_at;

-- insumos
DROP INDEX IF EXISTS idx_insumos_categoria;
DROP INDEX IF EXISTS idx_insumos_nombre;

-- movimientos_stock
DROP INDEX IF EXISTS idx_movimientos_stock_fecha;

-- pagos
DROP INDEX IF EXISTS idx_pagos_fecha;

-- pedidos
DROP INDEX IF EXISTS idx_pedidos_fecha_finalizacion;

-- productos
DROP INDEX IF EXISTS idx_productos_activo;
DROP INDEX IF EXISTS idx_productos_codigo;
DROP INDEX IF EXISTS idx_productos_destacado;
DROP INDEX IF EXISTS idx_productos_requiere_salsas;

-- proveedor_insumos
DROP INDEX IF EXISTS idx_proveedor_insumos_proveedor;

-- proveedores
DROP INDEX IF EXISTS idx_proveedores_nombre;

-- tickets
DROP INDEX IF EXISTS idx_tickets_numero;

-- predicciones_consumo
DROP INDEX IF EXISTS idx_predicciones_insumo_fecha;

-- movimientos_puntos
DROP INDEX IF EXISTS idx_movimientos_puntos_cliente_id;
DROP INDEX IF EXISTS idx_movimientos_puntos_fecha;

-- repartidores
DROP INDEX IF EXISTS idx_repartidores_estado;

-- asignaciones_entrega
DROP INDEX IF EXISTS idx_asignaciones_repartidor;
DROP INDEX IF EXISTS idx_asignaciones_estado;
DROP INDEX IF EXISTS idx_asignaciones_fecha;

-- rutas_entrega
DROP INDEX IF EXISTS idx_rutas_repartidor_fecha;

-- notificaciones
DROP INDEX IF EXISTS idx_notificaciones_leida;
DROP INDEX IF EXISTS idx_notificaciones_created;

-- whatsapp_messages
DROP INDEX IF EXISTS idx_whatsapp_messages_cliente;
DROP INDEX IF EXISTS idx_whatsapp_messages_status;

-- categorias
DROP INDEX IF EXISTS idx_categorias_active;

-- ============================================================
-- ENABLE RLS ON PUBLIC TABLES
-- ============================================================

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policies for roles
CREATE POLICY "Authenticated users can view roles"
ON public.roles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only service role can modify roles"
ON public.roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS on rol_permisos table
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;

-- Policies for rol_permisos
CREATE POLICY "Authenticated users can view rol_permisos"
ON public.rol_permisos
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only service role can modify rol_permisos"
ON public.rol_permisos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS on permisos table
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;

-- Policies for permisos
CREATE POLICY "Authenticated users can view permisos"
ON public.permisos
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Only service role can modify permisos"
ON public.permisos
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);