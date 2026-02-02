# Requerimientos para Carga de Fotos en Productos

## Estado Actual

### ✅ Lo que ya tenemos

1. **Base de Datos Preparada**
   - La tabla `productos` tiene el campo `imagenes_urls` (array de text)
   - Puede almacenar hasta 3 URLs de imágenes por producto
   - Estructura: `imagenes_urls: text[]`

2. **Formulario de Productos**
   - Ubicación: `src/components/ProductForm.tsx`
   - Actualmente permite ingresar URLs manualmente
   - Permite hasta 3 imágenes por producto
   - Líneas 552-590: Sección de imágenes actual

### ❌ Lo que falta

1. **Supabase Storage**
   - No hay buckets configurados actualmente
   - Se requiere crear bucket para almacenar imágenes
   - Se requieren políticas de acceso (RLS)

2. **Componente de Carga**
   - No existe componente para seleccionar archivos
   - No existe lógica de carga a storage
   - No existe validación de tipos de archivo
   - No existe compresión/optimización de imágenes

---

## Requerimientos Técnicos

### 1. Supabase Storage - Bucket

**Crear bucket: `product-images`**

```sql
-- Crear bucket público para imágenes de productos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,  -- Público para que las imágenes sean accesibles
  5242880,  -- 5MB límite por archivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
);
```

### 2. Políticas de Acceso (RLS)

**Política de Lectura (Pública)**
```sql
-- Permitir a todos leer las imágenes
CREATE POLICY "Imágenes públicas de productos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

**Política de Inserción (Autenticados)**
```sql
-- Solo usuarios autenticados pueden subir imágenes
CREATE POLICY "Usuarios autenticados pueden subir imágenes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');
```

**Política de Actualización (Autenticados)**
```sql
-- Solo usuarios autenticados pueden actualizar imágenes
CREATE POLICY "Usuarios autenticados pueden actualizar imágenes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');
```

**Política de Eliminación (Autenticados)**
```sql
-- Solo usuarios autenticados pueden eliminar imágenes
CREATE POLICY "Usuarios autenticados pueden eliminar imágenes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
```

### 3. Estructura de Almacenamiento

**Patrón de nombres de archivo:**
```
product-images/
  ├── {producto_id}/
  │   ├── image-1-{timestamp}.jpg
  │   ├── image-2-{timestamp}.png
  │   └── image-3-{timestamp}.webp
```

**Ejemplo:**
```
product-images/123/image-1-1703094847123.jpg
product-images/123/image-2-1703094847456.png
```

---

## Implementación Frontend

### 1. Componente de Carga de Archivos

**Características necesarias:**

- ✅ Drag & Drop de archivos
- ✅ Selector de archivos (input file)
- ✅ Preview de imágenes antes de subir
- ✅ Barra de progreso durante la carga
- ✅ Validación de tipo de archivo (solo imágenes)
- ✅ Validación de tamaño (máx 5MB por archivo)
- ✅ Máximo 3 imágenes por producto
- ✅ Eliminar imágenes existentes
- ✅ Comprimir imágenes antes de subir (opcional pero recomendado)

### 2. Lógica de Carga

```typescript
// Pseudocódigo de la lógica necesaria

const handleFileUpload = async (file: File, index: number) => {
  // 1. Validar tipo de archivo
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    throw new Error('Tipo de archivo no permitido');
  }

  // 2. Validar tamaño (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El archivo es demasiado grande (máx 5MB)');
  }

  // 3. Generar nombre único
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileName = `image-${index + 1}-${timestamp}.${fileExtension}`;
  const filePath = producto?.id
    ? `${producto.id}/${fileName}`
    : `temp/${fileName}`;

  // 4. Subir a Supabase Storage
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // 5. Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  // 6. Actualizar estado con la nueva URL
  updateImageUrl(index, publicUrl);
};
```

### 3. Componente Visual Propuesto

```typescript
// Estructura del componente de carga

<div className="space-y-3">
  {imageUrls.map((url, index) => (
    <div key={index} className="border-2 border-dashed rounded-lg p-4">
      {/* Si hay imagen, mostrar preview */}
      {url ? (
        <div className="flex items-center gap-4">
          <img
            src={url}
            alt={`Producto ${index + 1}`}
            className="w-20 h-20 object-cover rounded"
          />
          <div className="flex-1">
            <input
              type="url"
              value={url}
              readOnly
              className="w-full px-3 py-2 bg-gray-50 border rounded"
            />
          </div>
          <button onClick={() => removeImage(index)}>
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      ) : (
        /* Si no hay imagen, mostrar zona de carga */
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => handleDrop(e, index)}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            Arrastra una imagen o haz clic para seleccionar
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG, WebP o GIF (máx. 5MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, index)}
          />
        </div>
      )}

      {/* Barra de progreso durante la carga */}
      {uploadProgress[index] > 0 && uploadProgress[index] < 100 && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress[index]}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Subiendo... {uploadProgress[index]}%
          </p>
        </div>
      )}
    </div>
  ))}

  {/* Botón para agregar más imágenes */}
  {imageUrls.length < 3 && (
    <button
      type="button"
      onClick={addImageSlot}
      className="w-full p-3 border-2 border-dashed rounded-lg hover:bg-gray-50"
    >
      <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
      <span className="text-sm text-gray-600">
        Agregar imagen ({imageUrls.length}/3)
      </span>
    </button>
  )}
</div>
```

---

## Modificaciones Necesarias

### Archivos a Modificar

1. **`src/components/ProductForm.tsx`**
   - Reemplazar sección de imágenes (líneas 552-590)
   - Agregar lógica de carga de archivos
   - Agregar validaciones
   - Agregar preview de imágenes
   - Agregar barra de progreso

2. **Crear nueva migración SQL**
   - Crear bucket `product-images`
   - Configurar políticas RLS para storage

### Funcionalidades Adicionales Recomendadas

1. **Compresión de Imágenes**
   - Reducir tamaño antes de subir
   - Mantener calidad aceptable
   - Librería sugerida: `browser-image-compression`

2. **Optimización**
   - Convertir a WebP automáticamente
   - Generar thumbnails (opcional)
   - Lazy loading en listados

3. **Validaciones**
   - Dimensiones mínimas (ej: 300x300px)
   - Dimensiones máximas (ej: 2000x2000px)
   - Aspect ratio sugerido (ej: 1:1 o 4:3)

4. **Gestión de Archivos Antiguos**
   - Eliminar imágenes antiguas al reemplazar
   - Limpiar imágenes de productos eliminados
   - Función de limpieza de archivos huérfanos

---

## Flujo de Usuario

### Crear Nuevo Producto con Foto

1. Usuario abre modal de "Nuevo Producto"
2. Llena información básica
3. En sección de imágenes:
   - Hace clic o arrastra imagen
   - Sistema valida formato y tamaño
   - Sistema muestra preview
   - Sistema sube imagen a storage (si producto ya existe) o guarda temporalmente
4. Usuario guarda producto
5. Sistema:
   - Guarda producto en BD
   - Si hay imágenes temporales, las mueve a carpeta del producto
   - Guarda URLs en `imagenes_urls`

### Editar Producto Existente

1. Usuario abre modal de "Editar Producto"
2. Sistema muestra imágenes existentes
3. Usuario puede:
   - Eliminar imágenes existentes
   - Agregar nuevas imágenes
   - Reemplazar imágenes
4. Usuario guarda cambios
5. Sistema:
   - Elimina imágenes marcadas para borrar del storage
   - Sube nuevas imágenes
   - Actualiza array `imagenes_urls`

---

## Estimación de Esfuerzo

### Tareas Principales

| Tarea | Complejidad | Tiempo Estimado |
|-------|-------------|-----------------|
| Crear bucket y políticas RLS | Baja | 15 min |
| Modificar ProductForm.tsx | Media | 2-3 horas |
| Implementar lógica de carga | Media | 1-2 horas |
| Agregar validaciones | Baja | 30 min |
| Agregar preview y UI | Media | 1 hora |
| Implementar eliminación de archivos | Baja | 30 min |
| Testing y ajustes | Media | 1 hora |
| **TOTAL** | - | **6-8 horas** |

### Tareas Opcionales (Mejoras)

| Tarea | Complejidad | Tiempo Estimado |
|-------|-------------|-----------------|
| Compresión automática | Media | 1 hora |
| Conversión a WebP | Media | 1 hora |
| Thumbnails automáticos | Alta | 2 horas |
| Gestión de archivos huérfanos | Media | 1 hora |

---

## Consideraciones Importantes

### Limitaciones de Supabase Storage

- **Límite de tamaño por archivo**: 50MB (configurable, sugerido 5MB)
- **Límite de almacenamiento total**: Según plan de Supabase
- **Límite de ancho de banda**: Según plan de Supabase
- **Plan Free**: 1GB de storage, 2GB de transferencia/mes

### Seguridad

1. ✅ Solo usuarios autenticados pueden subir imágenes
2. ✅ Validación de tipos MIME en backend (Supabase)
3. ✅ Validación de tamaño en frontend Y backend
4. ✅ Las imágenes son públicas (necesario para mostrar en catálogo)
5. ⚠️ No permite scripts o archivos ejecutables

### SEO y Performance

1. ✅ Usar nombres descriptivos para archivos
2. ✅ Agregar atributos `alt` a las imágenes
3. ✅ Lazy loading para imágenes en listados
4. ✅ Comprimir imágenes para reducir tamaño
5. ✅ Usar formato WebP cuando sea posible

---

## Preguntas para el Usuario

Antes de implementar, es importante aclarar:

1. **¿Quieres que implemente la compresión automática de imágenes?**
   - Ventaja: Ahorra espacio y mejora velocidad de carga
   - Desventaja: Requiere librería adicional

2. **¿Prefieres mantener también la opción de URL manual?**
   - Útil para imágenes hospedadas externamente
   - Puede ser confuso tener ambas opciones

3. **¿Qué tamaño máximo de imagen prefieres?**
   - Recomendado: 5MB
   - Más flexible: 10MB

4. **¿Dimensiones específicas requeridas?**
   - Mínimo sugerido: 300x300px
   - Máximo sugerido: 2000x2000px
   - Aspect ratio: cuadrado (1:1) o flexible

---

## Próximos Pasos

Si decides implementar esta funcionalidad, los pasos serían:

1. **Crear migración SQL** para bucket y políticas
2. **Modificar ProductForm.tsx** con componente de carga
3. **Agregar validaciones** de tipo y tamaño
4. **Implementar lógica de Storage** (upload/delete)
5. **Testing** con diferentes formatos y tamaños
6. **Documentar** uso para otros usuarios

---

## Alternativas

Si no quieres usar Supabase Storage, otras opciones incluyen:

1. **Cloudinary** - CDN especializado en imágenes
   - Transformaciones automáticas
   - Optimización automática
   - Plan gratuito limitado

2. **AWS S3** - Almacenamiento en la nube
   - Muy escalable
   - Requiere configuración adicional
   - Costos variables

3. **Servicio de terceros** - Como Unsplash o Pexels
   - Solo para stock photos
   - No permite fotos propias

**Recomendación**: Supabase Storage es la mejor opción porque:
- Ya estás usando Supabase
- Integración nativa con tu proyecto
- Políticas RLS consistentes
- Sin costos adicionales (dentro del plan)
