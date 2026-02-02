# Auditoría del Sistema de Envíos y Entregas

## Fecha de Auditoría
2025-12-20

## Objetivo
Revisar y auditar el proceso completo de creación de envíos y seguimiento de entregas, verificando que el workflow funcione correctamente desde la creación de un pedido a domicilio hasta la entrega final por parte del repartidor.

---

## 1. ESTADO ACTUAL DEL SISTEMA

### 1.1 Estructura de Base de Datos

#### Tablas Existentes
1. **pedidos**: Tabla principal de pedidos
   - `tipo_entrega_id` → Referencia a tipos_entrega
   - `zona_entrega_id` → Referencia a zonas_entrega
   - `direccion_envio` (jsonb) → Contiene calle, ciudad, referencias, plus_code
   - `notas_entrega` (text)
   - `fecha_listo_para_entrega`, `fecha_entregado`, `tiempo_entrega_minutos`

2. **tipos_entrega**: Define tipos de entrega
   - ✅ 1 = "A domicilio" (requiere_direccion: true, tiene_costo_asociado: true)
   - ✅ 2 = "Para llevar"
   - ✅ 3 = "Comer aquí"

3. **zonas_entrega**: Zonas geográficas con costos de envío
   - nombre, costo, monto_minimo_envio_gratis
   - localidades_incluidas (array)
   - activa (boolean)

4. **repartidores**: Información de repartidores
   - usuario_id → Vínculo con tabla usuarios
   - nombre, telefono, vehiculo_tipo, placa_vehiculo
   - estado (disponible/ocupado/inactivo)
   - activo (boolean)

5. **asignaciones_entrega**: ⚠️ TABLA CREADA PERO NO UTILIZADA
   - pedido_id, repartidor_id
   - fecha_asignacion, fecha_recogida, fecha_entrega_real
   - tiempo_total_minutos, distancia_km
   - estado (asignado/en_camino/entregado/fallido)
   - calificacion, comentario_cliente

6. **rutas_entrega**: ⚠️ TABLA CREADA PERO NO UTILIZADA
   - repartidor_id, fecha
   - pedidos_ids (array)
   - orden_entrega (jsonb)
   - distancia_total_km, tiempo_estimado_minutos
   - completada (boolean)

### 1.2 Permisos Existentes
- ✅ `envios.gestionar.zonas` → Permite crear y administrar zonas de entrega
- ✅ `envios.ver.pendientes` → Permite ver y gestionar entregas pendientes
- ❌ **FALTA**: `envios.repartidor.ver` → Para que repartidores vean sus entregas
- ❌ **FALTA**: `envios.repartidor.actualizar` → Para que repartidores actualicen estados

### 1.3 RLS (Row Level Security)
- ✅ `asignaciones_entrega`: Políticas permisivas (todos los autenticados)
- ✅ `repartidores`: Políticas permisivas (todos los autenticados)
- ⚠️ **PROBLEMA**: Políticas muy abiertas, no hay restricciones por rol

---

## 2. ANÁLISIS DEL WORKFLOW ACTUAL

### 2.1 Flujo Implementado

```
1. Cliente hace pedido → [Vender.tsx]
   ↓
2. Se selecciona "A domicilio" (tipo_entrega_id = 1)
   ↓
3. Se asigna zona_entrega_id
   ↓
4. Se guarda direccion_envio (jsonb)
   ↓
5. Pedido se guarda en tabla pedidos
   ↓
6. ❌ NO SE CREA asignacion_entrega automáticamente
   ↓
7. Pedido aparece en "Entregas Pendientes" [GestionEnvios.tsx]
   ↓
8. Staff puede marcar: "Listo" → "En Reparto" → "Entregado"
   ↓
9. ❌ NO HAY asignación de repartidor
   ↓
10. ❌ Repartidor NO puede ver sus entregas
```

### 2.2 Función de Carga de Entregas

**Archivo**: `src/lib/store/pedidosStore.ts`

**Función**: `fetchPedidosParaEntrega()`

```typescript
// Busca pedidos donde:
- tipo_entrega_id = 1 (A domicilio)
- fecha_entregado IS NULL (no entregados)
- deleted_at IS NULL (no eliminados)
```

**Resultado**: ✅ Funciona correctamente para mostrar entregas pendientes

### 2.3 Interfaz de Gestión de Envíos

**Archivo**: `src/pages/GestionEnvios.tsx`

#### Pestaña 1: Zonas de Entrega
- ✅ Crear/editar zonas
- ✅ Activar/desactivar zonas
- ✅ Configurar costos y envío gratis

#### Pestaña 2: Entregas Pendientes
- ✅ Lista de pedidos a domicilio pendientes
- ✅ Información del cliente (nombre, teléfono)
- ✅ Dirección de entrega con referencias
- ✅ Monto total del pedido
- ✅ Estados: Preparando → Listo → En Ruta → Entregado
- ❌ **FALTA**: Selector para asignar repartidor
- ❌ **FALTA**: Mostrar método de pago del pedido
- ❌ **FALTA**: Mostrar repartidor asignado
- ❌ **FALTA**: Mapa con ubicaciones (código comentado)

---

## 3. PROBLEMAS IDENTIFICADOS

### 3.1 Críticos (Alta Prioridad)

#### ❌ P1: No hay creación automática de asignaciones
- **Problema**: Al crear un pedido a domicilio, NO se crea registro en `asignaciones_entrega`
- **Impacto**: La tabla existe pero nunca se usa
- **Evidencia**: Query mostró 3 pedidos a domicilio con 0 asignaciones creadas
- **Solución Requerida**: Trigger o función que cree asignación automáticamente

#### ❌ P2: No hay asignación de repartidores
- **Problema**: No existe interfaz para asignar un repartidor a una entrega
- **Impacto**: No se puede rastrear quién hace cada entrega
- **Solución Requerida**:
  - Agregar selector de repartidor en `GestionEnvios.tsx`
  - Crear/actualizar registro en `asignaciones_entrega`

#### ❌ P3: Repartidores no tienen interfaz propia
- **Problema**: No existe vista para que repartidores vean sus entregas asignadas
- **Impacto**: Repartidores no pueden gestionar sus entregas
- **Solución Requerida**:
  - Crear página `RepartidorEntregas.tsx`
  - Mostrar solo entregas asignadas al usuario actual
  - Permitir actualizar estados (recogido, en camino, entregado)

#### ❌ P4: No se muestra método de pago
- **Problema**: El repartidor necesita saber si debe cobrar en efectivo o ya está pagado
- **Impacto**: Confusión en el momento de la entrega
- **Solución Requerida**: Mostrar método de pago en interfaz de entregas

### 3.2 Importantes (Media Prioridad)

#### ⚠️ P5: Políticas RLS muy permisivas
- **Problema**: Todos los usuarios autenticados pueden ver/modificar todo
- **Impacto**: Falta de seguridad y privacidad
- **Solución Requerida**: Restringir por roles

#### ⚠️ P6: Falta optimización de rutas
- **Problema**: Tabla `rutas_entrega` existe pero no se usa
- **Impacto**: Repartidores no tienen rutas optimizadas
- **Solución Requerida**: Sistema de agrupación de entregas por zona/repartidor

#### ⚠️ P7: No hay seguimiento en tiempo real
- **Problema**: No hay actualización automática de estados
- **Impacto**: Staff debe refrescar manualmente
- **Solución Requerida**: Implementar suscripción a cambios en tiempo real (Supabase Realtime)

### 3.3 Deseables (Baja Prioridad)

#### 📋 P8: Mapa de entregas deshabilitado
- **Problema**: Código de mapa está comentado
- **Impacto**: No hay visualización geográfica de entregas
- **Nota**: Requiere geocodificación de direcciones

#### 📋 P9: No hay historial de entregas por repartidor
- **Problema**: No se pueden ver estadísticas de desempeño
- **Impacto**: Falta de métricas para evaluación

#### 📋 P10: No hay sistema de calificaciones
- **Problema**: Campos de calificación existen pero no se usan
- **Impacto**: No hay feedback de clientes

---

## 4. VERIFICACIÓN DE DATOS

### 4.1 Estado Actual en BD

```sql
-- Pedidos a domicilio: 3
-- Asignaciones creadas: 0
-- Asignaciones con repartidor: 0
```

### 4.2 Triggers Existentes

**En tabla `pedidos`:**
- ✅ `trigger_notify_new_pedido` → Notifica nuevo pedido
- ✅ `trigger_notify_pedido_estado` → Notifica cambio de estado
- ✅ `trigger_pedido_completado_puntos` → Otorga puntos de lealtad
- ✅ `trigger_sync_items_desde_pedido` → Sincroniza ítems de cocina
- ❌ **FALTA**: Trigger para crear asignación automática

---

## 5. ARQUITECTURA ESPERADA vs REAL

### 5.1 Workflow Esperado (Ideal)

```
[Pedido A Domicilio Creado]
         ↓
[Trigger crea asignacion_entrega] ← ❌ NO EXISTE
         ↓
[Asignación en estado: "pendiente"]
         ↓
[Staff asigna repartidor] ← ❌ NO IMPLEMENTADO
         ↓
[Estado: "asignado"]
         ↓
[Repartidor ve en su interfaz] ← ❌ NO EXISTE INTERFAZ
         ↓
[Repartidor marca "recogido"]
         ↓
[Repartidor marca "en_camino"]
         ↓
[Repartidor marca "entregado" + cobra si es efectivo]
         ↓
[Cliente califica servicio] ← ❌ NO IMPLEMENTADO
         ↓
[Estadísticas se actualizan]
```

### 5.2 Workflow Real (Actual)

```
[Pedido A Domicilio Creado]
         ↓
[Aparece en "Entregas Pendientes"]
         ↓
[Staff marca: Preparando → Listo → En Ruta → Entregado]
         ↓
[NO se registra quién entrega]
         ↓
[NO se registra tiempo real]
         ↓
[Pedido completado sin trazabilidad]
```

---

## 6. RECOMENDACIONES Y SIGUIENTES PASOS

### Fase 1: Funcionalidad Crítica (Debe implementarse YA)

#### 1.1 Crear trigger para asignaciones automáticas
```sql
CREATE OR REPLACE FUNCTION crear_asignacion_entrega()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es pedido a domicilio (tipo_entrega_id = 1)
  IF NEW.tipo_entrega_id = 1 THEN
    INSERT INTO asignaciones_entrega (
      pedido_id,
      estado,
      insert_by_user
    ) VALUES (
      NEW.id,
      'pendiente',
      NEW.insert_by_user
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crear_asignacion_entrega
  AFTER INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION crear_asignacion_entrega();
```

#### 1.2 Agregar asignación de repartidor en interfaz
- Modificar `GestionEnvios.tsx`
- Agregar dropdown de repartidores disponibles
- Al asignar: UPDATE asignaciones_entrega SET repartidor_id, estado='asignado'

#### 1.3 Mostrar método de pago y monto a cobrar
- En la tarjeta de entrega mostrar:
  - Método de pago (Efectivo, Tarjeta, Transferencia)
  - Si es efectivo: Monto a cobrar
  - Si tiene cambio: Cuánto

#### 1.4 Crear permisos específicos para repartidores
```sql
INSERT INTO permisos (nombre, descripcion) VALUES
  ('envios.repartidor.ver', 'Ver entregas asignadas al repartidor'),
  ('envios.repartidor.actualizar', 'Actualizar estado de entregas propias');
```

### Fase 2: Interfaz para Repartidores (Urgente)

#### 2.1 Crear página `MisEntregas.tsx`
Debe mostrar:
- ✅ Solo entregas asignadas al usuario actual
- ✅ Estado actual de cada entrega
- ✅ Dirección completa con referencias
- ✅ Nombre y teléfono del cliente
- ✅ Monto total y método de pago
- ✅ Botones de acción según estado:
  - "Recoger Pedido" (pendiente → recogido)
  - "Iniciar Entrega" (recogido → en_camino)
  - "Marcar Entregado" (en_camino → entregado)
- ✅ Opción para llamar al cliente
- ✅ Botón para abrir ubicación en Google Maps

#### 2.2 Agregar al menú lateral
- Solo visible para usuarios con rol "Repartidor"
- Icono: Camión o Moto
- Badge con número de entregas pendientes

### Fase 3: Optimizaciones (Importante)

#### 3.1 Mejorar políticas RLS
```sql
-- Repartidores solo ven sus propias asignaciones
CREATE POLICY "Repartidores ven sus asignaciones"
  ON asignaciones_entrega FOR SELECT
  TO authenticated
  USING (
    repartidor_id IN (
      SELECT id FROM repartidores
      WHERE usuario_id = auth.uid()
    )
  );
```

#### 3.2 Suscripción a cambios en tiempo real
- Implementar en `pedidosStore.ts`
- Auto-refrescar cuando cambian estados
- Notificaciones push (opcional)

#### 3.3 Sistema de notificaciones
- Notificar a repartidor cuando se le asigna entrega
- Notificar a cliente cuando pedido sale a reparto
- Notificar a staff cuando se entrega

### Fase 4: Mejoras Futuras (Deseable)

#### 4.1 Sistema de rutas optimizadas
- Agrupar entregas por zona
- Calcular ruta óptima
- Asignar múltiples entregas a un repartidor

#### 4.2 Historial y estadísticas
- Tiempo promedio de entrega por repartidor
- Número de entregas completadas
- Calificaciones promedio
- Distancia recorrida

#### 4.3 Sistema de calificaciones
- Cliente califica repartidor después de entrega
- Staff puede ver calificaciones históricas
- Incentivos por buenas calificaciones

---

## 7. IMPACTO ESTIMADO

### Sin implementar las correcciones:
- ❌ No hay trazabilidad de quién entrega
- ❌ No se puede medir desempeño de repartidores
- ❌ Repartidores necesitan que alguien les diga qué entregar
- ❌ No hay registro de tiempos reales
- ❌ Posibles confusiones con métodos de pago

### Implementando Fase 1 + Fase 2:
- ✅ Trazabilidad completa de entregas
- ✅ Repartidores autónomos con su app
- ✅ Mejor experiencia de usuario
- ✅ Datos para optimización futura
- ✅ Sistema escalable

---

## 8. ARCHIVOS AFECTADOS

### Base de Datos (Migraciones)
- `crear_trigger_asignaciones_entrega.sql`
- `agregar_permisos_repartidor.sql`
- `mejorar_rls_asignaciones.sql`

### Frontend (Componentes)
- `src/pages/GestionEnvios.tsx` (modificar)
- `src/pages/MisEntregas.tsx` (crear nuevo)
- `src/components/AsignarRepartidorModal.tsx` (crear nuevo)
- `src/lib/store/asignacionesStore.ts` (crear nuevo)

### Backend (Opcional - Edge Functions)
- `supabase/functions/notificar-asignacion/index.ts`
- `supabase/functions/calcular-ruta/index.ts`

---

## 9. PRIORIZACIÓN FINAL

### 🔴 CRÍTICO (Hacer primero)
1. Trigger para crear asignaciones automáticas
2. Agregar selector de repartidor en GestionEnvios
3. Crear interfaz MisEntregas para repartidores
4. Mostrar método de pago en entregas

### 🟡 IMPORTANTE (Hacer después)
5. Mejorar RLS por roles
6. Agregar permisos específicos
7. Sistema de notificaciones básico

### 🟢 MEJORAS (Hacer cuando haya tiempo)
8. Optimización de rutas
9. Sistema de calificaciones
10. Estadísticas y reportes

---

## 10. CONCLUSIÓN

El sistema de envíos tiene la **infraestructura de base de datos lista** (tablas creadas) pero **NO está conectada con el flujo de trabajo real**. Es como tener un auto completo pero sin conectar el motor a las ruedas.

### Estado Actual: 60% Implementado

**Lo que funciona:**
- ✅ Identificación de pedidos a domicilio
- ✅ Gestión de zonas de entrega
- ✅ Seguimiento básico de estados
- ✅ Interfaz para visualizar entregas pendientes

**Lo que NO funciona:**
- ❌ Creación automática de asignaciones
- ❌ Asignación de repartidores
- ❌ Interfaz para repartidores
- ❌ Visibilidad de método de pago
- ❌ Trazabilidad completa del proceso

### Recomendación:
**Implementar Fase 1 + Fase 2 como prioridad máxima** para tener un sistema funcional end-to-end. Sin estas correcciones, el sistema actual es incompleto y no cumple con el objetivo de seguimiento de entregas por repartidor.
