-- Inicia el código SQL para la migración

-- Insertar todos los permisos necesarios de forma segura (ignora si ya existen)
-- Esto crea una lista maestra y estandarizada.
INSERT INTO public.permisos (nombre, descripcion)
VALUES
    -- Dashboard y Reportes
    ('dashboard.ver', 'Permite ver el dashboard principal'),
    ('reportes.ver', 'Permite acceder a la sección de reportes'),

    -- Punto de Venta y Pedidos
    ('pedidos.crear', 'Permite crear nuevos pedidos desde el punto de venta'),
    ('pedidos.leer', 'Permite ver la lista de pedidos activos y transacciones'),
    ('pedidos.actualizar', 'Permite editar pedidos existentes'),
    ('pedidos.eliminar', 'Permite eliminar/cancelar pedidos'),
    ('pedidos.gestionar.estados', 'Permite cambiar el estado de un pedido (ej. de pendiente a en preparación)'),

    -- Productos y Categorías
    ('productos.gestionar', 'Permite crear, editar y eliminar productos'),
    ('categorias.productos.gestionar', 'Permite administrar las categorías de los productos'),

    -- Clientes y Crédito
    ('clientes.gestionar', 'Permite crear, editar y eliminar clientes'),
    ('clientes.credito.gestionar', 'Permite añadir o registrar pagos al saldo de un cliente'),

    -- Insumos y Proveedores
    ('insumos.gestionar', 'Permite administrar el catálogo de insumos'),
    ('proveedores.gestionar', 'Permite administrar el catálogo de proveedores'),
    ('recetas.gestionar', 'Permite asignar insumos y cantidades a los productos'),

    -- Mermas y Stock
    ('mermas.registrar', 'Permite registrar una nueva merma de insumos'),
    ('mermas.ver.historial', 'Permite ver el historial de mermas'),
    ('stock.ajustar', 'Permite realizar ajustes manuales de stock'),

    -- Envíos y Logística
    ('envios.gestionar.zonas', 'Permite crear y administrar las zonas de entrega'),
    ('envios.ver.pendientes', 'Permite ver y gestionar el mapa y la lista de entregas pendientes'),

    -- Administración del Sistema
    ('roles.gestionar', 'Permite crear roles y asignarles permisos'),
    ('usuarios.gestionar', 'Permite invitar, editar y asignar roles a los usuarios'),
    ('kds.ver', 'Permite acceder a la Pantalla de Cocina (KDS)')
ON CONFLICT (nombre) DO NOTHING;


-- Asegurar que el rol "admin" tenga todos los permisos existentes y nuevos
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT
    (SELECT id FROM public.roles WHERE nombre = 'admin'),
    p.id
FROM public.permisos p
ON CONFLICT (rol_id, permiso_id) DO NOTHING;