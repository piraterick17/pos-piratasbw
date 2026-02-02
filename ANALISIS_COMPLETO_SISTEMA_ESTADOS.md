# ANÁLISIS COMPLETO: Sistema de Estados y Dependencias

## Fecha
2025-12-20

## Propósito
Mapeo exhaustivo de TODOS los estados, transiciones, dependencias y precondiciones del sistema para prevenir errores antes de que ocurran.

---

## 🔴 ERRORES IDENTIFICADOS

### Error Actual: CHECK Constraint Violation
```
Code: 23514
Message: new row for relation "asignaciones_entrega" violates check constraint "asignaciones_entrega_estado_check"
```

**Causa Raíz:**
- La tabla `asignaciones_entrega` tiene un CHECK constraint que NO incluye 'pendiente'
- El trigger `crear_asignacion_entrega()` intenta insertar estado 'pendiente'
- Resultado: Violación del constraint

---

## 📊 MAPEO COMPLETO DE ESTADOS

### 1. Estados en `asignaciones_entrega`

**CHECK Constraint Actual:**
```sql
CHECK ((estado = ANY (ARRAY['asignado'::text, 'recogido'::text, 'en_camino'::text, 'entregado'::text, 'cancelado'::text])))
```

**Estados FALTANTES:** 'pendiente'

**Flujo de Estados Esperado:**
```
Creación → 'pendiente' (sin repartidor asignado)
    ↓
Asignación → 'asignado' (repartidor_id actualizado)
    ↓
Recogido → 'recogido' (pedido recogido por repartidor)
    ↓
En Camino → 'en_camino' (repartidor en ruta)
    ↓
Entregado → 'entregado' (pedido entregado al cliente)

En cualquier momento → 'cancelado'
```

**Estados REQUERIDOS en CHECK:**
- ✅ 'asignado'
- ✅ 'recogido'
- ✅ 'en_camino'
- ✅ 'entregado'
- ✅ 'cancelado'
- ❌ 'pendiente' (FALTA - causa el error)

---

### 2. Estados en `items_cocina`

**CHECK Constraint:**
```sql
CHECK (estado IN ('pendiente', 'preparando', 'listo', 'entregado'))
```

**Flujo:**
```
'pendiente' → 'preparando' → 'listo' → 'entregado'
```

**Estado:** ✅ Correcto (ya incluye 'pendiente')

---

### 3. Estados en `repartidores`

**CHECK Constraint:**
```sql
CHECK (estado IN ('disponible', 'en_ruta', 'no_disponible', 'inactivo'))
```

**Flujo:**
```
'disponible' → 'en_ruta' (cuando se le asigna pedido)
              ↓
           'disponible' (cuando termina entregas)

'no_disponible' / 'inactivo' (estados administrativos)
```

**Estado:** ✅ Correcto

---

### 4. Estados en `pedidos`

**CHECK Constraint:** NINGUNO (fue eliminado en migración 20250613222307_soft_surf.sql)

**Valores Usados:**
- 'pendiente', 'preparando', 'listo_para_entrega', 'en_ruta', 'entregado', 'completado', 'cancelado', etc.

**Estado:** ⚠️ Sin validación de constraint (manejo por tabla pedido_estados)

---

## 🔗 DEPENDENCIAS Y PRECONDICIONES

### 1. Tipos de Entrega

**Registros Existentes:**
| ID | Nombre | Requiere Dirección | Tiene Costo |
|----|--------|-------------------|-------------|
| 1  | A domicilio | ✅ true | ✅ true |
| 2  | Para llevar | ❌ false | ❌ false |
| 3  | Comer aquí | ❌ false | ❌ false |

**Precondiciones:**
- ✅ **tipo_entrega_id = 1**: Se crea asignación automática (trigger)
- ✅ **tipo_entrega_id = 2 o 3**: NO se crea asignación (pedido local)
- ❌ **tipo_entrega_id = NULL**: ¿Qué pasa? (campo es NULLABLE)
- ❌ **tipo_entrega_id = 99**: ¿Qué pasa si el ID no existe?

**Validación Requerida:**
```sql
-- En tabla pedidos
FOREIGN KEY (tipo_entrega_id) REFERENCES tipos_entrega(id)
```
✅ Ya existe la FK

---

### 2. Zona de Entrega

**Campo:** `pedidos.zona_entrega_id` (integer, NULLABLE)

**Precondiciones:**
- ✅ **tipo_entrega_id = 1 (A domicilio)**: Zona ES REQUERIDA
- ✅ **tipo_entrega_id = 2 o 3**: Zona NO es necesaria
- ❌ **A domicilio SIN zona**: ¿Validado en frontend? ¿En backend?

**Validación Actual:**
- Frontend: Validado en `validarCamposObligatorios()`
- Backend: Sin CHECK constraint

**Riesgo:** Si el frontend se salta, se puede crear pedido a domicilio sin zona

---

### 3. Dirección de Envío

**Campo:** `pedidos.direccion_envio` (jsonb, NULLABLE)

**Estructura Esperada:**
```json
{
  "calle": "string (requerido)",
  "ciudad": "string (opcional)",
  "referencias": "string (opcional)"
}
```

**Precondiciones:**
- ✅ **tipo_entrega_id = 1**: `direccion_envio.calle` ES REQUERIDA
- ✅ **tipo_entrega_id = 2 o 3**: `direccion_envio` NO es necesaria

**Validación Actual:**
- Frontend: Validado en `validarCamposObligatorios()`
- Backend: Sin validación

---

### 4. Repartidores

**Precondiciones:**
- ✅ **Creación de pedido**: NO requiere repartidor (asignación pendiente)
- ⚠️ **Marcar como entregado**: REQUIERE repartidor asignado
- ❌ **¿Qué pasa si NO HAY repartidores activos?**

**Validación Actual:**
- Función `marcar_pedido_entregado()`: Valida repartidor_id IS NOT NULL ✅
- Función `asignar_pedido_repartidor()`: Valida que repartidor esté activo ✅

**Riesgo:** Si no hay repartidores activos, los pedidos quedarán en 'pendiente' indefinidamente (aceptable, pero debe ser visible)

---

### 5. Estados de Pedido (pedido_estados)

**Precondición:** Debe existir estado con nombre 'Pendiente' o 'Completado'

**Validación en Código:**
```typescript
const { data: estadoData } = await supabase
  .from('pedido_estados')
  .select('id')
  .eq('nombre', estado === 'completado' ? 'Completado' : 'Pendiente')
  .single();
```

**Riesgo:** Si no existe el estado, falla la creación del pedido
**Mitigación:** Los estados se crean en migraciones iniciales

---

## ⚠️ ESCENARIOS PROBLEMÁTICOS

### Escenario 1: Pedido A Domicilio sin Zona
```
Usuario crea pedido:
- tipo_entrega_id = 1 (A domicilio)
- zona_entrega_id = NULL
- direccion_envio = { calle: "Calle X" }

Frontend: ✅ Validado (rechaza)
Backend: ❌ NO validado (se crearía)
```

**Solución Recomendada:** Agregar CHECK constraint o trigger de validación

---

### Escenario 2: Tipo de Entrega Inexistente
```
Usuario manipula request:
- tipo_entrega_id = 999

FK constraint: ✅ Rechaza (Foreign Key violation)
```

**Estado:** ✅ Ya protegido

---

### Escenario 3: Estado 'pendiente' en Asignación
```
Pedido creado con tipo_entrega_id = 1
Trigger inserta asignación:
- estado = 'pendiente'

CHECK constraint: ❌ RECHAZA (error actual)
```

**Solución:** Agregar 'pendiente' al CHECK constraint

---

### Escenario 4: Marcar como Entregado sin Repartidor
```
Staff intenta marcar asignación como entregada:
- repartidor_id = NULL

Función: ✅ Rechaza con excepción
```

**Estado:** ✅ Ya protegido

---

### Escenario 5: No Hay Repartidores Activos
```
Pedidos a domicilio se acumulan en 'pendiente'
No hay repartidores para asignar

Sistema: ⚠️ Funciona, pero pedidos se acumulan
```

**Solución Recomendada:** Vista o notificación para alertar cuando:
- Hay >5 asignaciones pendientes sin repartidores disponibles

---

## 🔧 SOLUCIONES REQUERIDAS

### 1. CRÍTICO: Agregar 'pendiente' a CHECK Constraint
```sql
ALTER TABLE asignaciones_entrega
  DROP CONSTRAINT asignaciones_entrega_estado_check;

ALTER TABLE asignaciones_entrega
  ADD CONSTRAINT asignaciones_entrega_estado_check
  CHECK (estado IN ('pendiente', 'asignado', 'recogido', 'en_camino', 'entregado', 'cancelado'));
```

**Prioridad:** 🔴 URGENTE
**Impacto:** Desbloquea creación de pedidos a domicilio

---

### 2. RECOMENDADO: Validación de Zona para Domicilio
```sql
-- Crear función de validación
CREATE OR REPLACE FUNCTION validar_pedido_domicilio()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es domicilio, requiere zona
  IF NEW.tipo_entrega_id = 1 THEN
    IF NEW.zona_entrega_id IS NULL THEN
      RAISE EXCEPTION 'Pedidos a domicilio requieren zona de entrega';
    END IF;
    IF NEW.direccion_envio IS NULL OR NOT (NEW.direccion_envio ? 'calle') THEN
      RAISE EXCEPTION 'Pedidos a domicilio requieren dirección con calle';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_validar_pedido_domicilio
  BEFORE INSERT OR UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION validar_pedido_domicilio();
```

**Prioridad:** 🟡 RECOMENDADO
**Impacto:** Previene datos inconsistentes si el frontend falla

---

### 3. OPCIONAL: Vista de Alertas
```sql
CREATE OR REPLACE VIEW v_alertas_operativas AS
SELECT
  'asignaciones_pendientes' as tipo_alerta,
  COUNT(*) as cantidad,
  'Hay asignaciones pendientes sin repartidor' as mensaje,
  CASE
    WHEN COUNT(*) > 10 THEN 'critico'
    WHEN COUNT(*) > 5 THEN 'alto'
    ELSE 'normal'
  END as nivel
FROM asignaciones_entrega
WHERE repartidor_id IS NULL AND estado = 'pendiente'
HAVING COUNT(*) > 0

UNION ALL

SELECT
  'repartidores_disponibles' as tipo_alerta,
  COUNT(*) as cantidad,
  CASE
    WHEN COUNT(*) = 0 THEN 'No hay repartidores disponibles'
    ELSE 'Repartidores disponibles'
  END as mensaje,
  CASE
    WHEN COUNT(*) = 0 THEN 'critico'
    WHEN COUNT(*) < 2 THEN 'alto'
    ELSE 'normal'
  END as nivel
FROM repartidores
WHERE activo = true AND estado IN ('disponible', 'en_ruta');
```

**Prioridad:** 🟢 OPCIONAL
**Impacto:** Visibilidad operativa

---

## 📋 CHECKLIST DE VALIDACIÓN COMPLETA

### Antes de Implementar
- [x] Identificar TODOS los CHECK constraints
- [x] Mapear TODOS los flujos de estado
- [x] Identificar TODAS las dependencias (FK, tipos, zonas, etc.)
- [x] Listar TODOS los escenarios problemáticos
- [x] Definir prioridades de soluciones

### Soluciones a Implementar
- [ ] Agregar 'pendiente' al CHECK constraint (CRÍTICO)
- [ ] Agregar trigger de validación para domicilio (RECOMENDADO)
- [ ] Crear vista de alertas operativas (OPCIONAL)

### Después de Implementar
- [ ] Probar creación de pedido a domicilio
- [ ] Probar creación de pedido local/para llevar
- [ ] Probar asignación de repartidor
- [ ] Probar entrega sin repartidor (debe fallar)
- [ ] Probar pedido domicilio sin zona (debe fallar si trigger implementado)
- [ ] Build del proyecto
- [ ] Verificar console.logs

---

## 🎯 PRECONDICIONES PARA EL USUARIO

### Para Crear Pedido A Domicilio
✅ **DEBE existir:**
1. Cliente válido (cliente_id)
2. Tipo de entrega ID = 1 en BD
3. Zona de entrega válida (zona_entrega_id)
4. Dirección con calle (direccion_envio.calle)

❌ **NO es necesario:**
1. Repartidor asignado (se asigna después)
2. Ciudad en dirección (opcional)

### Para Crear Pedido Local (Para Llevar / Comer Aquí)
✅ **DEBE existir:**
1. Cliente válido (cliente_id)
2. Tipo de entrega ID = 2 o 3 en BD

❌ **NO es necesario:**
1. Zona de entrega
2. Dirección
3. Repartidor

### Para Asignar Repartidor
✅ **DEBE existir:**
1. Pedido creado
2. Asignación en estado 'pendiente'
3. Repartidor activo

### Para Marcar como Entregado
✅ **DEBE existir:**
1. Asignación con repartidor_id NO NULL
2. Estado NO puede ser 'cancelado'

---

## 🔄 DIAGRAMA DE TRANSICIONES COMPLETO

```
PEDIDOS A DOMICILIO
===================

1. Usuario crea pedido
   ↓
2. Pedido insertado en BD
   ↓
3. Trigger detecta tipo_entrega_id = 1
   ↓
4. Crea asignación automática:
   - repartidor_id = NULL
   - estado = 'pendiente' ← ❌ FALLA AQUÍ (CHECK constraint)


FLUJO CORRECTO (DESPUÉS DE FIX)
================================

Pedido Creado
     ↓
Asignación: estado='pendiente', repartidor_id=NULL
     ↓
Staff Asigna Repartidor
     ↓
Asignación: estado='asignado', repartidor_id=X
     ↓
Repartidor Recoge
     ↓
Asignación: estado='recogido'
     ↓
Repartidor Sale
     ↓
Asignación: estado='en_camino'
     ↓
Repartidor Entrega
     ↓
Asignación: estado='entregado'
     ↓
Repartidor: estado='disponible' (si no tiene más entregas)
```

---

## 🎓 CONCLUSIÓN

**Problemas Identificados:**
1. 🔴 **CRÍTICO**: CHECK constraint no incluye 'pendiente' (bloquea operación)
2. 🟡 **MEDIO**: Falta validación backend para zona en pedidos a domicilio
3. 🟢 **BAJO**: Falta vista de alertas operativas

**Próximos Pasos:**
1. Crear migración que agregue 'pendiente' al CHECK constraint
2. Opcionalmente agregar trigger de validación de domicilio
3. Probar TODOS los escenarios
4. Documentar para el usuario

**Tiempo Estimado:** 15-20 minutos de implementación + pruebas
