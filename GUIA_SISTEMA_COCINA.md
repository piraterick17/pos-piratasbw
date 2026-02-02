# Guía del Sistema de Cocina por Estaciones con Sincronización

## Resumen de Implementación

Se ha implementado un sistema completo de gestión de cocina por estaciones con las siguientes características:

### ✅ Funcionalidades Principales

1. **Configuración de productos por estación**
2. **Sistema de progreso en tiempo real**
3. **Sincronización entre interfaces**
4. **Notificaciones automáticas**
5. **Indicadores visuales de avance**

---

## 1. Configuración de Productos y Estaciones

### Estaciones Disponibles por Defecto

El sistema incluye 5 estaciones de cocina pre-configuradas:

- 🔴 **Parrilla** - Para carnes, hamburguesas, etc.
- 🟠 **Freidora** - Para papas, alitas, etc.
- 🔵 **Bebidas** - Para preparación de bebidas
- 🌸 **Postres** - Para postres y dulces
- 🟢 **Ensaladas** - Para preparación de ensaladas

### Cómo Asignar Estaciones a un Producto

#### Paso 1: Acceder al Formulario de Productos

1. Ve a la sección **Productos**
2. Haz clic en **"Nuevo Producto"** o edita uno existente

#### Paso 2: Configurar Estaciones de Cocina

En el formulario de producto, encontrarás una nueva sección llamada **"Estaciones de Cocina"**:

1. **Selecciona las estaciones** donde se prepara el producto (puedes seleccionar múltiples)
2. Para cada estación seleccionada, configura:
   - **Tiempo de preparación** (en minutos): Tiempo estimado por unidad
   - **Complejidad** (1-5): Nivel de dificultad de preparación

#### Ejemplo: Configuración de una Hamburguesa

Una hamburguesa con papas fritas requiere preparación en dos estaciones:

**Estación 1: Parrilla**
- ✅ Seleccionada
- Tiempo: 8 minutos
- Complejidad: 3

**Estación 2: Freidora**
- ✅ Seleccionada
- Tiempo: 5 minutos
- Complejidad: 2

**Resultado:** Cuando se ordenen 3 hamburguesas, se crearán automáticamente:
- 3 items en Parrilla (24 minutos totales)
- 3 items en Freidora (15 minutos totales)
- **Total:** 6 items de cocina

### Visualización en la Lista de Productos

Los productos ahora muestran badges de colores indicando en qué estaciones se preparan:

```
Hamburguesa Especial
[Parrilla] [Freidora]
```

---

## 2. Sistema de Cocina por Estaciones (KitchenDisplayV2)

### Acceso

Desde el menú lateral: **Cocina V2** o **Sistema de Cocina por Estaciones**

### Interfaz y Funcionalidades

#### Pestañas de Estaciones

En la parte superior verás pestañas para cada estación activa con su color distintivo:

- 🔴 Parrilla
- 🟠 Freidora
- 🔵 Bebidas
- etc.

#### Tarjetas de Items

Cada tarjeta muestra:

1. **Información del Pedido**
   - Número de pedido
   - Cliente
   - Tiempo transcurrido

2. **Progreso del Pedido Completo** ⭐ NUEVO
   - Barra de progreso
   - Items listos / Items totales
   - Porcentaje completado

3. **Detalles del Item**
   - Cantidad y producto
   - Notas especiales

4. **Botones de Acción**
   - **Pendiente** → "Iniciar Preparación" → cambia a "Preparando"
   - **Preparando** → "Marcar como Listo" → cambia a "Listo"

#### Columnas de Estado

Los items se organizan en 3 columnas:

1. **Pendientes** (amarillo) - Esperando ser iniciados
2. **En Preparación** (azul) - Actualmente en proceso
3. **Listos** (verde) - Completados y esperando entrega

### Flujo de Trabajo

```
1. Llega un pedido de 2 hamburguesas
   ↓
2. Se crean automáticamente:
   - 2 items en Parrilla (estado: pendiente)
   - 2 items en Freidora (estado: pendiente)
   ↓
3. Cocinero en Parrilla:
   - Ve las 2 hamburguesas en "Pendientes"
   - Hace clic en "Iniciar Preparación"
   - Pasan a columna "En Preparación"
   ↓
4. Cocinero en Freidora:
   - Ve las 2 porciones de papas
   - Hace clic en "Iniciar Preparación"
   ↓
5. Cuando terminan:
   - Cada cocinero marca sus items como "Listo"
   - El progreso se actualiza en TODAS las pantallas
   ↓
6. Cuando todos los items están listos:
   - Se genera notificación automática
   - El encargado puede organizar la entrega
```

---

## 3. Pantalla de Cocina KDS (Kitchen Display System)

### Acceso

Desde el menú lateral: **Pantalla Cocina** o **KDS**

### Nuevas Funcionalidades ⭐

#### Indicador de Progreso de Cocina

Cada tarjeta de pedido ahora muestra:

1. **Sección "Estado de Cocina"** con:
   - Barra de progreso visual
   - Contador: "X/Y listos"
   - Porcentaje completado

2. **Colores Dinámicos:**
   - 🟠 Naranja (0-39%): Recién iniciado
   - 🟡 Amarillo (40-69%): Avance medio
   - 🔵 Azul (70-99%): Casi listo
   - 🟢 Verde (100%): Listo para entregar

3. **Actualización en Tiempo Real:**
   - Los cambios en el Sistema de Cocina se reflejan instantáneamente
   - No necesitas refrescar la página

#### Ejemplo Visual

```
┌─────────────────────────────────┐
│ Pedido #123                     │
│ Cliente: Juan Pérez             │
│                                 │
│ ╔═══ Estado de Cocina ═══╗     │
│ ║ 3/4 listos              ║     │
│ ║ ██████████████░░ 75%    ║     │
│ ╚═════════════════════════╝     │
│                                 │
│ Productos:                      │
│ • 2x Hamburguesa Especial       │
│                                 │
│ [Mover a "Listo para Entrega"]  │
└─────────────────────────────────┘
```

---

## 4. Pedidos Activos

### Acceso

Desde el menú lateral: **Pedidos**

### Nuevas Funcionalidades ⭐

#### Badge de Progreso de Cocina

Cada tarjeta de pedido incluye:

1. **Indicador "Cocina"** con:
   - Icono de tendencia
   - Items completados / Items totales
   - Barra de progreso
   - Porcentaje

2. **Colores según avance:**
   - 🟠 Naranja: 0-39%
   - 🟡 Amarillo: 40-69%
   - 🔵 Azul: 70-99%
   - 🟢 Verde: 100%

#### Ejemplo

```
┌──────────────────────┐
│ Pedido #124          │
│ María González       │
│ $450.00              │
│                      │
│ ╔═══ Cocina ═══╗    │
│ ║ 2/5           ║    │
│ ║ ████░░░░ 40%  ║    │
│ ╚═══════════════╝    │
└──────────────────────┘
```

---

## 5. Sistema de Notificaciones

### Notificación Automática: Pedido Listo

Cuando **todos los items** de un pedido están en estado "listo", el sistema:

1. **Genera automáticamente una notificación** con:
   - 🎉 Título: "Pedido Listo para Entregar"
   - Mensaje: Número de pedido y detalles
   - Prioridad: Alta

2. **Aparece en el NotificationBell** (campana en el header)

3. **Evita duplicados:** Si ya existe una notificación sin leer para ese pedido, no crea otra

### Acceso a Notificaciones

Haz clic en el ícono de campana 🔔 en la esquina superior derecha para:
- Ver todas las notificaciones pendientes
- Marcar como leídas
- Filtrar por tipo

---

## 6. Sincronización en Tiempo Real

### Cómo Funciona

El sistema utiliza **Supabase Realtime** para mantener todas las interfaces sincronizadas:

```
Sistema de Cocina (Estación Parrilla)
       ↓ (marca item como listo)
       ↓
Base de Datos actualiza
       ↓
       ├──→ KitchenDisplayV2: Actualiza barra de progreso
       ├──→ Pantalla Cocina KDS: Actualiza % en tarjeta
       ├──→ Pedidos Activos: Actualiza badge de cocina
       └──→ Notificaciones: Crea alerta si está 100% listo
```

### Ventajas

✅ **No necesitas refrescar la página**
✅ **Múltiples usuarios ven los mismos cambios simultáneamente**
✅ **Coordinación perfecta entre estaciones**
✅ **Visibilidad completa del flujo de trabajo**

---

## 7. Casos de Uso Reales

### Caso 1: Pedido Simple

**Pedido:** 3 Ensaladas César

**Flujo:**
1. Se crea 1 item en estación "Ensaladas"
2. Cocinero marca como "Preparando"
3. Al terminar, marca como "Listo"
4. Progreso: 1/1 (100%) → Notificación automática
5. Encargado ve notificación y organiza entrega

### Caso 2: Pedido Complejo

**Pedido:** 4 Hamburguesas Especiales con Papas

**Flujo:**
1. Se crean automáticamente:
   - 4 items en "Parrilla" (hamburguesas)
   - 4 items en "Freidora" (papas)
   - Total: 8 items

2. Cocinero en Parrilla:
   - Inicia las 4 hamburguesas
   - Progreso: 0/8 (0%)

3. Cocinero en Freidora:
   - Inicia las 4 porciones de papas
   - Progreso: 0/8 (0%)

4. Primera hamburguesa lista:
   - Marca como "Listo"
   - Progreso: 1/8 (12.5%)

5. Primera porción de papas lista:
   - Marca como "Listo"
   - Progreso: 2/8 (25%)

6. Todos terminan:
   - Progreso: 8/8 (100%)
   - 🎉 Notificación: "Pedido #X listo para entregar"

### Caso 3: Coordinación de Horarios

**Situación:** Pedido para las 14:00 con 5 productos diferentes

**Ventaja del Sistema:**
- El encargado ve en tiempo real qué items ya están listos
- Puede identificar cuellos de botella (ej: Postres tardando más)
- Puede coordinar para que todo esté listo al mismo tiempo
- Reduce tiempos de espera del cliente

---

## 8. Mejores Prácticas

### Para el Personal de Cocina

1. **Marcar estados correctamente:**
   - ✅ Usa "Iniciar Preparación" cuando realmente comiences
   - ✅ Usa "Marcar como Listo" solo cuando esté completamente terminado

2. **Revisar el progreso del pedido:**
   - Verifica cuántos items faltan en otras estaciones
   - Coordina con otros cocineros para entregas simultáneas

3. **Atender por prioridad:**
   - Las tarjetas con fondo rojo son urgentes
   - El sistema calcula automáticamente la prioridad

### Para el Personal de Mostrador/Entrega

1. **Monitorear Pedidos Activos:**
   - Revisa constantemente el progreso de cocina
   - Anticipa cuándo estarán listos los pedidos

2. **Responder a notificaciones:**
   - Cuando veas 🎉 "Pedido Listo", organiza inmediatamente
   - Coordina con repartidores si es envío a domicilio

3. **Usar múltiples pantallas:**
   - Una para Pedidos Activos (vista general)
   - Otra para Pantalla Cocina KDS (detalle de preparación)

---

## 9. Troubleshooting

### Problema: No aparecen items en Sistema de Cocina

**Causa:** El producto no tiene estaciones asignadas

**Solución:**
1. Ve a **Productos**
2. Edita el producto
3. En "Estaciones de Cocina", selecciona al menos una estación
4. Configura tiempo y complejidad
5. Guarda

### Problema: El progreso no se actualiza

**Causa:** Problema de conexión en tiempo real

**Solución:**
1. Refresca la página (F5)
2. Verifica tu conexión a internet
3. Si persiste, cierra sesión y vuelve a entrar

### Problema: Aparecen demasiadas notificaciones

**Causa:** Multiple items marcándose como listos rápidamente

**Solución:**
- Es comportamiento normal
- El sistema evita duplicados automáticamente
- Marca las notificaciones como leídas regularmente

### Problema: Un producto genera items incorrectos

**Causa:** Configuración de estaciones mal hecha

**Solución:**
1. Ve a **Productos** y edita el producto
2. Revisa las estaciones seleccionadas
3. Asegúrate que las estaciones sean correctas
4. Actualiza la configuración

---

## 10. Mantenimiento y Configuración Avanzada

### Agregar Nueva Estación

Si necesitas agregar una estación personalizada:

```sql
INSERT INTO estaciones_cocina (nombre, orden, color, active)
VALUES ('Plancha', 6, '#8b5cf6', true);
```

### Modificar Tiempos de Preparación Masivamente

Si quieres ajustar los tiempos de todos los productos en una estación:

```sql
UPDATE productos_estaciones
SET tiempo_preparacion = tiempo_preparacion * 1.2
WHERE estacion_id = (
  SELECT id FROM estaciones_cocina WHERE nombre = 'Parrilla'
);
```

### Ver Estadísticas de Estaciones

```sql
SELECT
  e.nombre AS estacion,
  COUNT(ci.id) AS items_totales,
  COUNT(CASE WHEN ci.estado = 'listo' THEN 1 END) AS items_listos,
  ROUND(AVG(ci.tiempo_estimado)) AS tiempo_promedio
FROM estaciones_cocina e
LEFT JOIN cocina_items ci ON e.id = ci.estacion_id
WHERE ci.created_at >= NOW() - INTERVAL '7 days'
GROUP BY e.nombre
ORDER BY items_totales DESC;
```

---

## 11. Beneficios del Sistema

### Para el Negocio

✅ **Reducción de tiempos de espera** - Mejor coordinación entre estaciones
✅ **Mayor satisfacción del cliente** - Entregas más precisas y rápidas
✅ **Menos errores** - Sistema automatizado reduce olvidos
✅ **Mejor control de operaciones** - Visibilidad completa del flujo

### Para el Personal

✅ **Claridad en responsabilidades** - Cada estación sabe qué preparar
✅ **Menos estrés** - Sistema organizado y priorizado automáticamente
✅ **Coordinación eficiente** - Visibilidad del progreso de otros
✅ **Menos interrupciones** - No necesitan preguntar constantemente el estado

### Para los Clientes

✅ **Tiempos de entrega más precisos**
✅ **Pedidos completos y correctos**
✅ **Experiencia consistente**
✅ **Mayor confianza en el servicio**

---

## 12. Próximos Pasos Sugeridos

### Optimizaciones Futuras

1. **Reportes de eficiencia por estación**
2. **Análisis de tiempos reales vs estimados**
3. **Predicción de tiempos de entrega basada en carga**
4. **Dashboard de métricas de cocina**
5. **Integración con pantallas en cocina (tablets)**

---

## Soporte

Para cualquier duda o problema con el sistema:

1. Consulta esta guía
2. Revisa la sección de Troubleshooting
3. Verifica que todos los productos tengan estaciones asignadas
4. Asegúrate de que el personal conozca el flujo de trabajo

**Recuerda:** El sistema funciona mejor cuando todos los miembros del equipo lo usan consistentemente y marcan los estados correctamente.

---

**Versión:** 1.0
**Fecha:** Octubre 2025
**Sistema:** Gestión de Cocina por Estaciones con Sincronización en Tiempo Real
