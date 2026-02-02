/*
  # Fix Security Issues - Part 2: RLS Auth Function Optimization

  1. **RLS Policy Optimization**
    - Wraps auth.uid() and auth.role() with SELECT subquery  
    - Prevents re-evaluation for each row
    - Improves performance by 10-100x on large result sets

  2. **Optimized Policies**
    - All policies that call auth functions directly
    - No logic changes, only performance optimization

  ## Note
  - Maintains exact same security semantics
  - Pure performance optimization
*/

-- ============================================================
-- CLIENTES POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Admins pueden gestionar todos los clientes" ON public.clientes;
CREATE POLICY "Admins pueden gestionar todos los clientes"
ON public.clientes
FOR ALL
USING ((SELECT auth.role()) = 'authenticated')
WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admins pueden ver todos los clientes" ON public.clientes;
CREATE POLICY "Admins pueden ver todos los clientes"
ON public.clientes
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Usuarios pueden ver clientes activos" ON public.clientes;
CREATE POLICY "Usuarios pueden ver clientes activos"
ON public.clientes
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated' AND deleted_at IS NULL);

-- ============================================================
-- SIMPLE AUTHENTICATED POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Permitir gestión de categorías de insumos a usuarios autentic" ON public.insumo_categorias;
CREATE POLICY "Permitir gestión de categorías de insumos a usuarios autentic"
ON public.insumo_categorias
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de detalles de pedido a usuarios autenticados" ON public.detalles_pedido;
CREATE POLICY "Permitir gestión de detalles de pedido a usuarios autenticados"
ON public.detalles_pedido
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de insumos a usuarios autenticados" ON public.insumos;
CREATE POLICY "Permitir gestión de insumos a usuarios autenticados"
ON public.insumos
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de movimientos de insumos a usuarios autentic" ON public.movimientos_insumo;
CREATE POLICY "Permitir gestión de movimientos de insumos a usuarios autentic"
ON public.movimientos_insumo
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de pagos a usuarios autenticados" ON public.pagos;
CREATE POLICY "Permitir gestión de pagos a usuarios autenticados"
ON public.pagos
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de proveedor-insumo a usuarios autenticados" ON public.proveedor_insumos;
CREATE POLICY "Permitir gestión de proveedor-insumo a usuarios autenticados"
ON public.proveedor_insumos
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de proveedores a usuarios autenticados" ON public.proveedores;
CREATE POLICY "Permitir gestión de proveedores a usuarios autenticados"
ON public.proveedores
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de recetas a usuarios autenticados" ON public.producto_insumos;
CREATE POLICY "Permitir gestión de recetas a usuarios autenticados"
ON public.producto_insumos
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de tickets a usuarios autenticados" ON public.tickets;
CREATE POLICY "Permitir gestión de tickets a usuarios autenticados"
ON public.tickets
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir gestión de zonas de entrega a admins" ON public.zonas_entrega;
CREATE POLICY "Permitir gestión de zonas de entrega a admins"
ON public.zonas_entrega
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de categorías a usuarios autenticados" ON public.categorias;
CREATE POLICY "Permitir lectura de categorías a usuarios autenticados"
ON public.categorias
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de estados a usuarios autenticados" ON public.pedido_estados;
CREATE POLICY "Permitir lectura de estados a usuarios autenticados"
ON public.pedido_estados
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de movimientos a autenticados" ON public.movimientos_stock;
CREATE POLICY "Permitir lectura de movimientos a autenticados"
ON public.movimientos_stock
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de productos a usuarios autenticados" ON public.productos;
CREATE POLICY "Permitir lectura de productos a usuarios autenticados"
ON public.productos
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de tipos_entrega a usuarios autenticados" ON public.tipos_entrega;
CREATE POLICY "Permitir lectura de tipos_entrega a usuarios autenticados"
ON public.tipos_entrega
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Permitir lectura de transiciones a usuarios autenticados" ON public.estado_transiciones;
CREATE POLICY "Permitir lectura de transiciones a usuarios autenticados"
ON public.estado_transiciones
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================
-- NOTIFICACIONES POLICIES (using user_id from notificaciones table)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notificaciones;
CREATE POLICY "Users can view own notifications"
ON public.notificaciones
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificaciones;
CREATE POLICY "Users can update own notifications"
ON public.notificaciones
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notificaciones;
CREATE POLICY "Users can delete own notifications"
ON public.notificaciones
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- NOTIFICACIONES_CONFIG POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view own config" ON public.notificaciones_config;
CREATE POLICY "Users can view own config"
ON public.notificaciones_config
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own config" ON public.notificaciones_config;
CREATE POLICY "Users can insert own config"
ON public.notificaciones_config
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own config" ON public.notificaciones_config;
CREATE POLICY "Users can update own config"
ON public.notificaciones_config
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));