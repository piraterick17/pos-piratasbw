/*
  # Fix Security Issues - Part 1: Foreign Key Indexes

  1. **Foreign Key Indexes**
    - Creates indexes for all unindexed foreign key columns (23 tables)
    - Improves query performance on joins and foreign key lookups
    - Critical for production performance at scale

  2. **Tables Affected**
    - alertas_inventario (insert_by_user)
    - asignaciones_entrega (insert_by_user)
    - cocina_items (detalle_pedido_id)
    - estado_transiciones (estado_destino_id)
    - finanzas_movimientos (categoria_id, movimiento_insumo_id, pedido_id, proveedor_id)
    - finanzas_pagos_recurrentes (categoria_id)
    - movimientos_credito_cliente (cliente_id, pedido_id)
    - movimientos_puntos (insert_by_user, pedido_id)
    - pagos (cobrado_por_usuario_id)
    - pedidos (cobrado_por_usuario_id, tipo_entrega_id, zona_entrega_id)
    - productos_estaciones (estacion_id)
    - recetas (producto_id)
    - repartidores (usuario_id)
    - rol_permisos (permiso_id)
    - usuarios (rol_id)
    - whatsapp_messages (template_id)

  ## Performance Impact
  - Significantly improves JOIN performance
  - Reduces query execution time on foreign key lookups
  - Essential for scalability
*/

-- alertas_inventario
CREATE INDEX IF NOT EXISTS idx_alertas_inventario_insert_by_user 
ON public.alertas_inventario(insert_by_user);

-- asignaciones_entrega
CREATE INDEX IF NOT EXISTS idx_asignaciones_entrega_insert_by_user 
ON public.asignaciones_entrega(insert_by_user);

-- cocina_items
CREATE INDEX IF NOT EXISTS idx_cocina_items_detalle_pedido_id 
ON public.cocina_items(detalle_pedido_id);

-- estado_transiciones
CREATE INDEX IF NOT EXISTS idx_estado_transiciones_estado_destino 
ON public.estado_transiciones(estado_destino_id);

-- finanzas_movimientos (4 foreign keys)
CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_categoria 
ON public.finanzas_movimientos(categoria_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_movimiento_insumo 
ON public.finanzas_movimientos(movimiento_insumo_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_pedido 
ON public.finanzas_movimientos(pedido_id);

CREATE INDEX IF NOT EXISTS idx_finanzas_movimientos_proveedor 
ON public.finanzas_movimientos(proveedor_id);

-- finanzas_pagos_recurrentes
CREATE INDEX IF NOT EXISTS idx_finanzas_pagos_recurrentes_categoria 
ON public.finanzas_pagos_recurrentes(categoria_id);

-- movimientos_credito_cliente (2 foreign keys)
CREATE INDEX IF NOT EXISTS idx_movimientos_credito_cliente_cliente 
ON public.movimientos_credito_cliente(cliente_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_credito_cliente_pedido 
ON public.movimientos_credito_cliente(pedido_id);

-- movimientos_puntos (2 foreign keys)
CREATE INDEX IF NOT EXISTS idx_movimientos_puntos_insert_by_user 
ON public.movimientos_puntos(insert_by_user);

CREATE INDEX IF NOT EXISTS idx_movimientos_puntos_pedido 
ON public.movimientos_puntos(pedido_id);

-- pagos
CREATE INDEX IF NOT EXISTS idx_pagos_cobrado_por_usuario 
ON public.pagos(cobrado_por_usuario_id);

-- pedidos (3 foreign keys)
CREATE INDEX IF NOT EXISTS idx_pedidos_cobrado_por_usuario 
ON public.pedidos(cobrado_por_usuario_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_tipo_entrega 
ON public.pedidos(tipo_entrega_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_zona_entrega 
ON public.pedidos(zona_entrega_id);

-- productos_estaciones
CREATE INDEX IF NOT EXISTS idx_productos_estaciones_estacion 
ON public.productos_estaciones(estacion_id);

-- recetas
CREATE INDEX IF NOT EXISTS idx_recetas_producto 
ON public.recetas(producto_id);

-- repartidores
CREATE INDEX IF NOT EXISTS idx_repartidores_usuario 
ON public.repartidores(usuario_id);

-- rol_permisos
CREATE INDEX IF NOT EXISTS idx_rol_permisos_permiso 
ON public.rol_permisos(permiso_id);

-- usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_rol 
ON public.usuarios(rol_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template 
ON public.whatsapp_messages(template_id);