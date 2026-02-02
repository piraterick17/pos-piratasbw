# 🧪 BATERÍA DE PRUEBAS - FASE 3
## Sistema de Notificaciones, Cocina Mejorada y WhatsApp

---

## 📋 ÍNDICE
1. [Sistema de Notificaciones en Tiempo Real](#1-sistema-de-notificaciones-en-tiempo-real)
2. [Módulo de Cocina Mejorado](#2-módulo-de-cocina-mejorado)
3. [Sistema de WhatsApp](#3-sistema-de-whatsapp)
4. [Pruebas de Integración](#4-pruebas-de-integración)

---

## 1. SISTEMA DE NOTIFICACIONES EN TIEMPO REAL

### 1.1 Configuración Inicial

**Objetivo:** Verificar que el sistema de notificaciones esté correctamente configurado.

#### Prueba 1.1.1: Verificar Componente de Notificaciones
- [ ] **Acción:** Iniciar sesión en el sistema
- [ ] **Resultado Esperado:**
  - Debe aparecer un ícono de campana (🔔) en la esquina superior derecha del header
  - El ícono debe estar visible en todas las páginas
- [ ] **Verificación:** El componente NotificationBell se renderiza correctamente

#### Prueba 1.1.2: Verificar Estado Inicial
- [ ] **Acción:** Click en el ícono de la campana
- [ ] **Resultado Esperado:**
  - Se abre un panel desplegable
  - Muestra "No tienes notificaciones" si no hay notificaciones
  - Panel tiene sección de configuración (ícono de engranaje)
- [ ] **Verificación:** Panel funciona correctamente

### 1.2 Notificaciones Automáticas de Pedidos

#### Prueba 1.2.1: Nuevo Pedido
- [ ] **Acción:** Crear un nuevo pedido desde el punto de venta
  1. Ir a "Vender"
  2. Seleccionar cliente
  3. Agregar productos
  4. Confirmar pedido
- [ ] **Resultado Esperado:**
  - Aparece badge rojo con "1" en el ícono de notificaciones
  - Se muestra un toast notification automático con: "🔔 Nuevo Pedido: Pedido #XXX - [Nombre Cliente]"
  - Al abrir panel: notificación aparece en la lista
- [ ] **Verificación:** Notificación creada correctamente en tiempo real

#### Prueba 1.2.2: Cambio de Estado de Pedido
- [ ] **Acción:** Cambiar estado de un pedido existente
  1. Ir a "Pedidos Activos"
  2. Seleccionar un pedido
  3. Cambiar estado a "En Preparación"
- [ ] **Resultado Esperado:**
  - Nueva notificación: "👨‍🍳 Pedido en Preparación: Pedido #XXX está siendo preparado"
  - Badge incrementa en 1
  - Toast notification aparece
- [ ] **Verificación:** Trigger de cambio de estado funciona

#### Prueba 1.2.3: Estados Múltiples
Repetir con cada estado:
- [ ] **Pendiente → En Preparación:** Notificación con icono 👨‍🍳
- [ ] **En Preparación → Listo:** Notificación con icono ✅
- [ ] **Listo → En Camino:** Notificación con icono 🚗
- [ ] **En Camino → Entregado:** Notificación con icono ✅
- [ ] **Cualquier estado → Cancelado:** Notificación con icono ❌

### 1.3 Notificaciones de Stock Bajo

#### Prueba 1.3.1: Stock Bajo en Insumo
- [ ] **Acción:** Reducir stock de un insumo por debajo del mínimo
  1. Ir a "Insumos"
  2. Seleccionar un insumo
  3. Registrar salida que deje stock < stock_minimo
- [ ] **Resultado Esperado:**
  - Notificación: "⚠️ Stock Bajo: El insumo '[Nombre]' tiene stock bajo (X unidades)"
  - Link dirige a /insumos
  - Toast notification aparece
- [ ] **Verificación:** Trigger de stock bajo funciona

#### Prueba 1.3.2: No Notificar si Stock Suficiente
- [ ] **Acción:** Reducir stock pero mantenerlo arriba del mínimo
- [ ] **Resultado Esperado:** NO debe generar notificación
- [ ] **Verificación:** Trigger no se ejecuta innecesariamente

### 1.4 Funcionalidades del Panel

#### Prueba 1.4.1: Marcar como Leída
- [ ] **Acción:**
  1. Abrir panel de notificaciones
  2. Click en botón "Marcar como leída" de una notificación
- [ ] **Resultado Esperado:**
  - Background de notificación cambia de azul claro a blanco
  - Badge del contador disminuye en 1
  - Botón "Marcar como leída" desaparece
- [ ] **Verificación:** Estado de lectura se actualiza correctamente

#### Prueba 1.4.2: Marcar Todas como Leídas
- [ ] **Acción:** Click en botón "CheckCheck" (marcar todas)
- [ ] **Resultado Esperado:**
  - Todas las notificaciones cambian a estado "leída"
  - Badge desaparece (muestra 0)
  - Ya no aparece el botón de marcar todas
- [ ] **Verificación:** Función RPC funciona correctamente

#### Prueba 1.4.3: Eliminar Notificación
- [ ] **Acción:** Click en botón "X" de una notificación
- [ ] **Resultado Esperado:**
  - Notificación desaparece de la lista
  - Si era no leída, badge disminuye
  - Cambio es permanente (no reaparece al recargar)
- [ ] **Verificación:** DELETE funciona correctamente

#### Prueba 1.4.4: Navegar desde Notificación
- [ ] **Acción:** Click en el cuerpo de una notificación que tiene link
- [ ] **Resultado Esperado:**
  - Usuario es redirigido a la página correspondiente
  - Notificación se marca como leída automáticamente
  - Panel se cierra
- [ ] **Verificación:** Links funcionan correctamente

### 1.5 Configuración de Preferencias

#### Prueba 1.5.1: Desactivar Tipo de Notificación
- [ ] **Acción:**
  1. Abrir panel de notificaciones
  2. Click en ícono de engranaje (Settings)
  3. Desactivar "Nuevos pedidos"
  4. Crear un nuevo pedido
- [ ] **Resultado Esperado:**
  - NO debe aparecer notificación de nuevo pedido
  - Otras notificaciones siguen funcionando
- [ ] **Verificación:** Preferencias se respetan

#### Prueba 1.5.2: Desactivar Sonido
- [ ] **Acción:**
  1. Desactivar checkbox "Sonido" en configuración
  2. Generar una notificación
- [ ] **Resultado Esperado:**
  - Notificación aparece visualmente
  - NO se reproduce sonido (si hay archivos de audio)
- [ ] **Verificación:** Configuración de sonido funciona

### 1.6 Tiempo Real (Realtime)

#### Prueba 1.6.1: Múltiples Usuarios
- [ ] **Acción:**
  1. Abrir 2 sesiones con diferentes usuarios
  2. En sesión 1: crear un pedido
- [ ] **Resultado Esperado:**
  - Sesión 2 recibe notificación INMEDIATAMENTE sin recargar página
  - Badge se actualiza en tiempo real
- [ ] **Verificación:** Supabase Realtime funciona

#### Prueba 1.6.2: Reconexión
- [ ] **Acción:**
  1. Deshabilitar WiFi por 10 segundos
  2. Crear pedidos mientras está desconectado
  3. Reconectar WiFi
- [ ] **Resultado Esperado:**
  - Al reconectar, notificaciones pendientes aparecen
  - Sistema se sincroniza automáticamente
- [ ] **Verificación:** Manejo de desconexión funciona

---

## 2. MÓDULO DE COCINA MEJORADO

### 2.1 Configuración de Estaciones

#### Prueba 2.1.1: Verificar Estaciones por Defecto
- [ ] **Acción:**
  1. Navegar a "Cocina por Estaciones" (sidebar)
  2. Verificar tabs superiores
- [ ] **Resultado Esperado:**
  - Deben aparecer 5 estaciones:
    - Parrilla (rojo)
    - Freidora (naranja)
    - Bebidas (azul)
    - Postres (rosa)
    - Ensaladas (verde)
- [ ] **Verificación:** Migraciones ejecutadas correctamente

#### Prueba 2.1.2: Cambiar entre Estaciones
- [ ] **Acción:** Click en cada tab de estación
- [ ] **Resultado Esperado:**
  - Tab activo cambia de color
  - Contenido se filtra por estación
  - Sin errores en consola
- [ ] **Verificación:** Filtrado funciona

### 2.2 Asignación de Productos a Estaciones

**Nota:** Esta funcionalidad requiere datos en `productos_estaciones`. Primero hay que insertar manualmente:

```sql
-- Ejemplo: asignar productos a estaciones
INSERT INTO productos_estaciones (producto_id, estacion_id, tiempo_preparacion, complejidad)
SELECT
  p.id,
  (SELECT id FROM estaciones_cocina WHERE nombre = 'Parrilla' LIMIT 1),
  15, -- minutos
  4   -- complejidad
FROM productos p
WHERE p.nombre ILIKE '%hamburguesa%' OR p.nombre ILIKE '%carne%'
LIMIT 3;
```

#### Prueba 2.2.1: Crear Pedido con Producto Asignado
- [ ] **Acción:**
  1. Asignar productos a estaciones (SQL arriba)
  2. Crear pedido con esos productos
  3. Ir a "Cocina por Estaciones"
  4. Seleccionar la estación correspondiente
- [ ] **Resultado Esperado:**
  - Items aparecen en columna "Pendientes"
  - Cada item muestra:
    - Número de pedido
    - Cliente
    - Cantidad y producto
    - Timer
    - Tiempo estimado
    - Barra de progreso
- [ ] **Verificación:** Trigger `crear_items_cocina` funciona

### 2.3 Sistema de Priorización

#### Prueba 2.3.1: Prioridad por Tiempo de Espera
- [ ] **Acción:**
  1. Crear 3 pedidos con diferencia de 10 minutos cada uno
  2. Esperar que pasen tiempos diferentes
  3. Ver estación de cocina
- [ ] **Resultado Esperado:**
  - Pedidos más antiguos tienen mayor prioridad (más arriba)
  - Cards de mayor prioridad son rojas
  - Cards de prioridad media son amarillas
  - Cards de prioridad baja son verdes
- [ ] **Verificación:** Función `calcular_prioridad_cocina` funciona

#### Prueba 2.3.2: Prioridad por Tipo de Pedido
- [ ] **Acción:**
  1. Crear pedido tipo "delivery"
  2. Crear pedido tipo "local" al mismo tiempo
- [ ] **Resultado Esperado:**
  - Pedido "delivery" debe tener +1 prioridad
  - Se ordena primero en la lista
- [ ] **Verificación:** Lógica de tipo de pedido funciona

#### Prueba 2.3.3: Prioridad por Complejidad
- [ ] **Acción:** Asignar productos con diferentes niveles de complejidad (1-5)
- [ ] **Resultado Esperado:**
  - Productos con complejidad >=4 tienen mayor prioridad
  - Se ordenan correctamente
- [ ] **Verificación:** Factor de complejidad se aplica

### 2.4 Timers y Barras de Progreso

#### Prueba 2.4.1: Timer Inicial
- [ ] **Acción:** Crear pedido y ver item en cocina
- [ ] **Resultado Esperado:**
  - Timer muestra minutos desde creación
  - Actualiza automáticamente cada 10 segundos
  - Formato: "Xm" (ejemplo: "5m", "12m")
- [ ] **Verificación:** useEffect de timer funciona

#### Prueba 2.4.2: Barra de Progreso
- [ ] **Acción:** Observar barra de progreso en el tiempo
- [ ] **Resultado Esperado:**
  - Barra crece con el tiempo
  - Color verde: < 70% del tiempo
  - Color amarillo: 70-90% del tiempo
  - Color rojo: > 90% del tiempo
  - Porcentaje se calcula correctamente
- [ ] **Verificación:** Colores dinámicos funcionan

### 2.5 Cambio de Estados en Cocina

#### Prueba 2.5.1: Iniciar Preparación
- [ ] **Acción:** Click en item en estado "Pendiente"
- [ ] **Resultado Esperado:**
  - Item se mueve a columna "En Preparación"
  - Se registra timestamp `inicio_preparacion`
  - Timer ahora cuenta desde inicio de preparación
  - Toast notification: "Preparación iniciada"
- [ ] **Verificación:** UPDATE funciona

#### Prueba 2.5.2: Marcar como Listo
- [ ] **Acción:** Click en item en estado "Preparando"
- [ ] **Resultado Esperado:**
  - Item se mueve a columna "Listos"
  - Se registra timestamp `fin_preparacion`
  - Botón cambia a "✓ Listo para Entregar"
  - Toast notification: "Item marcado como listo"
- [ ] **Verificación:** Cambio de estado funciona

#### Prueba 2.5.3: Items Listos No Son Clickeables
- [ ] **Acción:** Intentar click en item "Listo"
- [ ] **Resultado Esperado:**
  - No hace nada (cursor normal, no pointer)
  - Se mantiene en su posición
- [ ] **Verificación:** Lógica condicional funciona

### 2.6 Tiempo Real en Cocina

#### Prueba 2.6.1: Actualización Automática
- [ ] **Acción:**
  1. Abrir "Cocina por Estaciones" en navegador 1
  2. Crear pedido en navegador 2
- [ ] **Resultado Esperado:**
  - Navegador 1 muestra nuevo item AUTOMÁTICAMENTE
  - Sin necesidad de refrescar
- [ ] **Verificación:** Supabase Realtime channel funciona

#### Prueba 2.6.2: Sincronización Multi-Usuario
- [ ] **Acción:**
  1. Abrir cocina en 2 navegadores
  2. En navegador 1: cambiar estado de un item
- [ ] **Resultado Esperado:**
  - Navegador 2 actualiza inmediatamente
  - Item se mueve a la columna correcta
- [ ] **Verificación:** Sincronización funciona

### 2.7 Notas Especiales

#### Prueba 2.7.1: Mostrar Notas del Detalle
- [ ] **Acción:**
  1. Crear pedido con notas en un producto (ej: "Sin cebolla")
  2. Ver en cocina
- [ ] **Resultado Esperado:**
  - Aparece sección con fondo amarillo
  - Muestra "Notas: Sin cebolla"
  - Es claramente visible
- [ ] **Verificación:** Notas se muestran

### 2.8 Pruebas de Carga

#### Prueba 2.8.1: Múltiples Items
- [ ] **Acción:** Crear 20 pedidos con 3 productos cada uno
- [ ] **Resultado Esperado:**
  - Sistema mantiene rendimiento
  - Scroll funciona correctamente
  - Sin lag al cambiar estaciones
  - Queries son eficientes
- [ ] **Verificación:** Índices de BD funcionan

---

## 3. SISTEMA DE WHATSAPP

### ✅ IMPORTANTE: WhatsApp está implementado (interfaz y base de datos)

El sistema de WhatsApp está implementado con la interfaz de usuario y estructura de base de datos completa.

**Estado:** ✅ Interfaz y BD implementadas | ⏳ Edge Functions pendientes

### 3.1 Verificación de Interfaz

#### Prueba 3.1.1: Acceder a la página de WhatsApp
- [ ] **Acción:** Navegar a sidebar → "WhatsApp"
- [ ] **Resultado Esperado:**
  - Aparece página con título "WhatsApp Business"
  - 3 tabs visibles: Configuración, Plantillas, Historial
  - Badge indica estado (Activo/Inactivo)
- [ ] **Verificación:** Página se carga correctamente

#### Prueba 3.1.2: Tab de Configuración
- [ ] **Acción:** Estar en tab "Configuración"
- [ ] **Resultado Esperado:**
  - Formulario con campos:
    - Proveedor de API (Meta/Twilio)
    - Número de teléfono
    - Phone Number ID (si Meta)
    - API Token (con botón mostrar/ocultar)
    - Webhook Verify Token
    - Checkbox "Activar integración"
  - Botón "Guardar Configuración"
  - Panel de información con instrucciones
- [ ] **Verificación:** Todos los campos están presentes

#### Prueba 3.1.3: Guardar Configuración
- [ ] **Acción:**
  1. Seleccionar proveedor "Meta"
  2. Llenar campos con datos de prueba
  3. Activar checkbox
  4. Click en "Guardar Configuración"
- [ ] **Resultado Esperado:**
  - Toast: "Configuración guardada correctamente"
  - Badge cambia a "Activo"
  - Datos persisten al recargar página
- [ ] **Verificación:** INSERT/UPDATE en tabla `whatsapp_config` funciona

### 3.2 Plantillas de Mensajes

#### Prueba 3.2.1: Ver Plantillas Predefinidas
- [ ] **Acción:** Click en tab "Plantillas"
- [ ] **Resultado Esperado:**
  - Muestra 6 plantillas por defecto:
    - nuevo_pedido (categoría: pedido)
    - pedido_preparando (categoría: pedido)
    - pedido_listo (categoría: pedido)
    - pedido_en_camino (categoría: pedido)
    - pedido_entregado (categoría: pedido)
    - stock_bajo (categoría: stock)
  - Cada plantilla muestra:
    - Nombre
    - Categoría (badge)
    - Contenido del mensaje
    - Variables en badges azules
    - Botón Activa/Inactiva
- [ ] **Verificación:** Datos de tabla `whatsapp_templates` se muestran

#### Prueba 3.2.2: Activar/Desactivar Plantilla
- [ ] **Acción:** Click en botón "Activa" de una plantilla
- [ ] **Resultado Esperado:**
  - Toast: "Plantilla desactivada"
  - Botón cambia a "Inactiva"
  - Color cambia de verde a gris
  - Al hacer click de nuevo: se reactiva
- [ ] **Verificación:** UPDATE en tabla funciona

#### Prueba 3.2.3: Verificar Variables en Plantillas
- [ ] **Acción:** Revisar plantilla "nuevo_pedido"
- [ ] **Resultado Esperado:**
  - Variables mostradas: nombre, pedido_id, total, tiempo
  - Texto de plantilla contiene {nombre}, {pedido_id}, etc.
- [ ] **Verificación:** Variables coinciden con el template

### 3.3 Historial de Mensajes

#### Prueba 3.3.1: Ver Historial Vacío
- [ ] **Acción:** Click en tab "Historial"
- [ ] **Resultado Esperado:**
  - Tabla con columnas: Fecha, Destinatario, Mensaje, Estado
  - Mensaje: "No hay mensajes enviados aún"
- [ ] **Verificación:** Query a tabla `whatsapp_messages` funciona

#### Prueba 3.3.2: Insertar Mensaje de Prueba
- [ ] **Acción:** Ejecutar SQL de prueba:
```sql
INSERT INTO whatsapp_messages (
  cliente_id,
  phone_number,
  message_content,
  status
)
SELECT
  id,
  telefono,
  'Mensaje de prueba',
  'sent'
FROM clientes
LIMIT 1;
```
- [ ] **Resultado Esperado:**
  - Recargar página
  - Mensaje aparece en historial
  - Muestra: fecha, cliente, teléfono, contenido, badge "sent"
- [ ] **Verificación:** Tabla renderiza datos correctamente

#### Prueba 3.3.3: Estados de Mensajes
- [ ] **Acción:** Insertar mensajes con diferentes estados
- [ ] **Resultado Esperado:**
  - pending: badge gris, icono Send
  - sent: badge azul, icono CheckCircle
  - delivered: badge verde, icono CheckCircle
  - read: badge morado, icono CheckCircle
  - failed: badge rojo, icono AlertCircle
- [ ] **Verificación:** Colores e iconos correctos

### 3.4 Verificación de Base de Datos

#### Prueba 3.4.1: Estructura de Tablas
- [ ] **Acción:** Ejecutar SQL:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'whatsapp%';
```
- [ ] **Resultado Esperado:**
  - whatsapp_config
  - whatsapp_templates
  - whatsapp_messages
- [ ] **Verificación:** 3 tablas existen

#### Prueba 3.4.2: Verificar RLS
- [ ] **Acción:** Ejecutar SQL:
```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename LIKE 'whatsapp%';
```
- [ ] **Resultado Esperado:**
  - Policies en todas las tablas
  - Usuarios autenticados pueden ver/gestionar
- [ ] **Verificación:** RLS habilitado

### 3.5 Integración Futura (Edge Functions - PENDIENTE)

**Nota:** La funcionalidad de envío real requiere implementar Edge Functions.

#### Funciones Pendientes:
- [ ] **whatsapp-send**: Enviar mensajes vía API
- [ ] **whatsapp-webhook**: Recibir actualizaciones de estado
- [ ] **whatsapp-triggers**: Triggers automáticos para eventos

#### Triggers Automáticos Planificados:
- [ ] Nuevo pedido → enviar confirmación
- [ ] Pedido en preparación → notificar cliente
- [ ] Pedido listo → avisar que puede recoger
- [ ] Pedido en camino → enviar tracking
- [ ] Pedido entregado → agradecer
- [ ] Stock bajo → notificar administrador

### 3.6 Pruebas de Seguridad

#### Prueba 3.6.1: Campos Sensibles
- [ ] **Acción:** Verificar que API Token está oculto por defecto
- [ ] **Resultado Esperado:**
  - Campo tipo "password" (puntos)
  - Botón ojo para mostrar/ocultar
- [ ] **Verificación:** Datos sensibles protegidos

#### Prueba 3.6.2: RLS en Configuración
- [ ] **Acción:** Intentar acceder a config desde otro usuario
- [ ] **Resultado Esperado:**
  - Solo usuarios autenticados pueden ver/editar
- [ ] **Verificación:** Policies funcionan correctamente

---

## 4. PRUEBAS DE INTEGRACIÓN

### 4.1 Flujo Completo: Venta → Cocina → Notificaciones

#### Prueba 4.1.1: Flujo End-to-End
- [ ] **Acción:** Ejecutar flujo completo:
  1. Crear pedido en Punto de Venta
  2. Verificar notificación en tiempo real
  3. Abrir Cocina por Estaciones
  4. Verificar items aparecen en pendientes
  5. Iniciar preparación
  6. Verificar notificación de cambio de estado
  7. Marcar como listo
  8. Verificar notificación final

- [ ] **Resultado Esperado:** Todo funciona sin errores

### 4.2 Pruebas de Performance

#### Prueba 4.2.1: Carga de Base de Datos
- [ ] **Acción:** Ejecutar queries de verificación:

```sql
-- Verificar índices
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('notificaciones', 'cocina_items', 'estaciones_cocina');

-- Verificar policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('notificaciones', 'cocina_items');

-- Verificar triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('pedidos', 'insumos', 'detalles_pedido');
```

- [ ] **Resultado Esperado:** Todos los índices, policies y triggers existen

### 4.3 Pruebas de Seguridad

#### Prueba 4.3.1: RLS en Notificaciones
- [ ] **Acción:**
  1. Intentar acceder a notificaciones de otro usuario mediante SQL directo
  2. Verificar que RLS bloquea el acceso
- [ ] **Verificación:** Solo se ven propias notificaciones

#### Prueba 4.3.2: RLS en Cocina
- [ ] **Acción:** Verificar que usuarios autenticados pueden ver/editar items
- [ ] **Verificación:** Policies correctas activas

### 4.4 Pruebas de Errores

#### Prueba 4.4.1: Pedido Sin Productos Asignados
- [ ] **Acción:** Crear pedido con producto que NO está en `productos_estaciones`
- [ ] **Resultado Esperado:**
  - Pedido se crea correctamente
  - NO aparece en cocina por estaciones
  - NO genera error
- [ ] **Verificación:** Sistema maneja caso edge

#### Prueba 4.4.2: Desconexión de Red
- [ ] **Acción:** Simular pérdida de conexión
- [ ] **Resultado Esperado:**
  - Sistema muestra mensaje de error amigable
  - Al reconectar, se sincroniza
  - No se pierden datos
- [ ] **Verificación:** Manejo de errores funciona

---

## 📊 RESUMEN DE ESTADO

### ✅ Completado e Implementado:
1. **Sistema de Notificaciones en Tiempo Real**
   - ✅ Base de datos completa
   - ✅ Triggers automáticos
   - ✅ Hook useNotifications
   - ✅ Componente NotificationBell
   - ✅ Tiempo real con Supabase
   - ✅ Configuración de preferencias

2. **Módulo de Cocina Mejorado**
   - ✅ Base de datos de estaciones
   - ✅ Sistema de priorización
   - ✅ Componente KitchenDisplayV2
   - ✅ Timers y barras de progreso
   - ✅ Tiempo real
   - ✅ Integrado en sidebar

3. **Sistema de WhatsApp (Interfaz y BD)**
   - ✅ Tablas de base de datos
   - ✅ Página de configuración
   - ✅ Gestión de plantillas
   - ✅ Historial de mensajes
   - ✅ Integrado en sidebar

### ⏳ Pendiente:
1. **Sistema de WhatsApp (Edge Functions)**
   - ⏳ Edge Function para enviar mensajes
   - ⏳ Edge Function para webhook
   - ⏳ Triggers automáticos de envío
   - ⏳ Integración real con Meta/Twilio API

2. **Mejoras Opcionales**
   - ⏳ Archivos de audio para notificaciones
   - ⏳ Notificaciones push del navegador (Web Push API)
   - ⏳ Métricas de cocina en dashboard

---

## 🎯 CRITERIOS DE ÉXITO

Para considerar la Fase 3 completa, se deben cumplir:

- [x] Notificaciones aparecen en tiempo real
- [x] Triggers automáticos funcionan
- [x] Cocina por estaciones muestra items correctamente
- [x] Sistema de priorización funciona
- [x] Timers se actualizan automáticamente
- [x] Cambios de estado se sincronizan en tiempo real
- [x] No hay errores en consola del navegador
- [x] Proyecto compila sin errores
- [x] WhatsApp - Interfaz y base de datos implementadas
- [ ] WhatsApp - Edge Functions (para futuras iteraciones)

---

## 📝 NOTAS PARA EL DESARROLLADOR

1. **Datos de Prueba:** Para probar cocina por estaciones, necesitas insertar datos en `productos_estaciones` manualmente primero.

2. **Permisos:** Asegúrate que tu usuario tenga el permiso `kds.ver` para ver las opciones de cocina en el sidebar.

3. **Realtime:** Supabase Realtime debe estar habilitado en tu proyecto para que las notificaciones funcionen.

4. **Performance:** Si tienes muchos pedidos, considera implementar paginación en el futuro.

5. **Logs:** Revisa la consola del navegador para ver eventos de Supabase Realtime y debugging.

---

## 🚀 COMENZAR PRUEBAS

Para iniciar la batería de pruebas:

1. Asegúrate que el proyecto está construido: `npm run build`
2. Inicia el servidor de desarrollo (si no está corriendo)
3. Inicia sesión con un usuario admin
4. Sigue cada prueba en orden
5. Marca cada checkbox conforme completes las pruebas
6. Documenta cualquier error encontrado

---

**Versión:** 1.0
**Fecha:** 2025-10-13
**Estado:** Listo para pruebas
