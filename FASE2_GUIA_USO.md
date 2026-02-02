# Guía de Uso - Fase 2: Inventario Inteligente, CRM y Gestión de Entregas

## Resumen de Implementación

Se ha completado exitosamente la Fase 2 del sistema con las siguientes funcionalidades:

### ✅ Datos Inicializados
- **3,018 clientes segmentados** automáticamente
- **14 alertas de inventario** activas
- **5 repartidores** registrados
- **2 clientes en riesgo** identificados
- **Sistema de puntos** integrado (trigger automático)

---

## 1. Sistema de Inventario Inteligente

### Funcionalidades Implementadas

#### Alertas Automáticas de Stock
- **Crítico**: Insumo se agotará en ≤3 días (rojo)
- **Advertencia**: Insumo se agotará en ≤7 días (naranja)
- **Normal**: Stock por debajo del nivel deseado (amarillo)

#### Predicción de Consumo
- Calcula consumo promedio diario basado en últimos 30 días
- Estima cuántos días quedan antes de agotarse
- Sugiere cantidad óptima de compra

#### Componente Visual Creado
```typescript
// Componente: src/components/AlertasInventario.tsx
<AlertasInventario />
```

**Uso en la aplicación:**
```typescript
import { AlertasInventario } from '../components/AlertasInventario';

// En página de Insumos o Dashboard
<AlertasInventario />
```

### Funciones SQL Disponibles

```sql
-- Actualizar alertas (ejecutar diariamente)
SELECT actualizar_alertas_inventario();

-- Calcular días restantes de un insumo
SELECT calcular_dias_restantes(insumo_id);

-- Obtener sugerencias de compra
SELECT * FROM generar_sugerencias_compra(insumo_id);

-- Ver insumos críticos
SELECT * FROM v_insumos_criticos;
```

### Automatización Recomendada
Crear un cron job para ejecutar diariamente:
```sql
SELECT actualizar_alertas_inventario();
```

---

## 2. Sistema de CRM y Fidelización

### Segmentación Automática de Clientes

**Segmentos definidos:**
1. **VIP**: >$5,000 gastados O >20 pedidos
2. **Regular**: >$1,000 gastados O >5 pedidos
3. **Nuevo**: <3 pedidos
4. **En Riesgo**: Cliente regular sin comprar en 30+ días
5. **Inactivo**: >60 días sin comprar

**Resultados actuales:**
- 3,016 clientes nuevos
- 1 cliente en riesgo
- 1 cliente inactivo

### Sistema de Puntos de Lealtad

**Reglas:**
- 1 punto por cada $10 gastados
- 100 puntos = $10 de descuento
- Niveles: Bronce → Plata → Oro → Platino

**Integración Automática:**
El sistema otorga puntos automáticamente cuando un pedido se marca como "completado" o "enviado" mediante un trigger de base de datos.

#### Componente Visual Creado
```typescript
// Componente: src/components/MetricasCliente.tsx
<MetricasCliente clienteId="uuid-del-cliente" />
```

**Uso en la aplicación:**
```typescript
import { MetricasCliente } from '../components/MetricasCliente';

// En modal de detalle de cliente o perfil
<MetricasCliente clienteId={cliente.id} />
```

### Funciones SQL Disponibles

```sql
-- Actualizar segmentos de todos los clientes (ejecutar diariamente)
SELECT actualizar_segmentos_clientes();

-- Ver métricas completas de un cliente
SELECT * FROM v_metricas_clientes WHERE cliente_id = 'uuid';

-- Ver clientes VIP
SELECT * FROM v_clientes_vip;

-- Ver clientes en riesgo
SELECT * FROM v_clientes_en_riesgo;

-- Ver productos favoritos de un cliente
SELECT * FROM v_productos_favoritos_cliente WHERE cliente_id = 'uuid';

-- Canjear puntos manualmente
SELECT canjear_puntos('cliente_id', 100, 'Canje manual');
```

### Vistas Útiles para Análisis

```sql
-- Dashboard de clientes por segmento
SELECT
  segmento,
  COUNT(*) as cantidad,
  ROUND(AVG(total_gastado), 2) as promedio_gastado,
  ROUND(AVG(ticket_promedio), 2) as ticket_promedio
FROM clientes_segmentos
GROUP BY segmento;

-- Top 10 clientes por valor
SELECT * FROM v_metricas_clientes
ORDER BY total_gastado DESC
LIMIT 10;
```

---

## 3. Gestión de Entregas y Repartidores

### Repartidores Registrados

Se crearon 5 repartidores de ejemplo:
1. Juan Pérez (Moto) - Disponible
2. María González (Auto) - Disponible
3. Carlos Ramírez (Moto) - Disponible
4. Ana Martínez (Bicicleta) - Disponible
5. Pedro López (Moto) - No Disponible

### Página de Gestión Creada
```
src/pages/Repartidores.tsx
```

**Características:**
- Ver todos los repartidores con métricas
- Crear/editar/eliminar repartidores
- Ver entregas completadas, calificación promedio
- Ver entregas hoy y esta semana
- Tiempo promedio de entrega
- Distancia total recorrida

### Funciones SQL Disponibles

```sql
-- Asignar pedido a repartidor
SELECT asignar_pedido_repartidor(pedido_id, repartidor_id, usuario_id);

-- Marcar pedido como entregado
SELECT marcar_pedido_entregado(asignacion_id, calificacion, comentario);

-- Sugerir mejor repartidor disponible
SELECT * FROM sugerir_repartidor_disponible();

-- Ver entregas activas
SELECT * FROM v_entregas_activas;

-- Ver pedidos sin asignar
SELECT * FROM v_pedidos_sin_asignar;

-- Agrupar pedidos por zona para optimizar rutas
SELECT * FROM agrupar_pedidos_por_zona();

-- Ver métricas de repartidores
SELECT * FROM v_desempeno_repartidores;
```

### Flujo de Trabajo de Entregas

1. **Pedido listo para entrega**
   ```sql
   -- Ver pedidos sin asignar
   SELECT * FROM v_pedidos_sin_asignar;
   ```

2. **Asignar a repartidor**
   ```sql
   -- Sugerir mejor repartidor
   SELECT * FROM sugerir_repartidor_disponible();

   -- Asignar
   SELECT asignar_pedido_repartidor(123, 1);
   ```

3. **Completar entrega**
   ```sql
   SELECT marcar_pedido_entregado(asignacion_id, 5, 'Excelente servicio');
   ```

---

## 4. Automatización y Mantenimiento

### Tareas Programadas Recomendadas

#### Diariamente (ejecutar cada 24 horas)
```sql
-- Actualizar segmentos de clientes
SELECT actualizar_segmentos_clientes();

-- Actualizar alertas de inventario
SELECT actualizar_alertas_inventario();
```

#### Semanalmente
```sql
-- Revisar clientes en riesgo
SELECT * FROM v_clientes_en_riesgo;

-- Revisar insumos críticos
SELECT * FROM v_insumos_criticos;
```

---

## 5. Integración con la Aplicación

### Agregar al Menú de Navegación

Para agregar la página de Repartidores al menú:

```typescript
// En el archivo de rutas o Sidebar
import Repartidores from './pages/Repartidores';

// Agregar ruta
{ path: '/repartidores', element: <Repartidores /> }
```

### Mostrar Alertas en Dashboard

```typescript
import { AlertasInventario } from './components/AlertasInventario';

function Dashboard() {
  return (
    <div>
      <h2>Dashboard</h2>
      <AlertasInventario />
      {/* Resto del dashboard */}
    </div>
  );
}
```

### Mostrar Métricas en Perfil de Cliente

```typescript
import { MetricasCliente } from './components/MetricasCliente';

function ClienteDetalle({ clienteId }) {
  return (
    <div>
      <MetricasCliente clienteId={clienteId} />
      {/* Resto de la información del cliente */}
    </div>
  );
}
```

---

## 6. Consultas Útiles para Reportes

### Top Clientes VIP
```sql
SELECT
  nombre,
  total_gastado,
  total_pedidos,
  puntos_actuales,
  nivel_lealtad
FROM v_clientes_vip
ORDER BY total_gastado DESC
LIMIT 20;
```

### Clientes que Necesitan Atención
```sql
SELECT
  nombre,
  telefono,
  dias_sin_comprar,
  total_gastado,
  nivel_riesgo
FROM v_clientes_en_riesgo
WHERE dias_sin_comprar > 45
ORDER BY total_gastado DESC;
```

### Insumos a Punto de Agotarse
```sql
SELECT
  nombre,
  stock_actual,
  dias_restantes,
  cantidad_sugerida_compra,
  proveedor_preferido
FROM v_insumos_criticos
WHERE dias_restantes <= 7
ORDER BY dias_restantes;
```

### Desempeño de Repartidores del Mes
```sql
SELECT
  nombre,
  entregas_completadas,
  calificacion_promedio,
  tiempo_promedio_entrega
FROM v_desempeno_repartidores
WHERE entregas_completadas > 0
ORDER BY calificacion_promedio DESC, entregas_completadas DESC;
```

---

## 7. Próximos Pasos Recomendados

1. **Integrar componentes en UI existente**
   - Agregar `<AlertasInventario />` en página de Insumos
   - Agregar `<MetricasCliente />` en detalles de cliente
   - Agregar enlace a página de Repartidores en menú

2. **Configurar automatización**
   - Configurar cron job para actualizar segmentos diariamente
   - Configurar cron job para actualizar alertas cada 6 horas

3. **Capacitar al equipo**
   - Mostrar cómo usar el sistema de puntos
   - Explicar la segmentación de clientes
   - Entrenar en asignación de repartidores

4. **Monitorear y ajustar**
   - Revisar precisión de predicciones de inventario
   - Ajustar umbrales de segmentación según necesidades
   - Optimizar rutas de entrega según resultados

---

## Soporte

Todas las funciones están documentadas en la base de datos. Para ver la documentación:

```sql
-- Ver comentarios de tablas
SELECT
  tablename,
  obj_description((schemaname||'.'||tablename)::regclass) as description
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('alertas_inventario', 'clientes_segmentos', 'programa_puntos', 'repartidores');

-- Ver comentarios de funciones
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%cliente%' OR routine_name LIKE '%alerta%' OR routine_name LIKE '%repartidor%';
```
