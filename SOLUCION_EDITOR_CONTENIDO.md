# Solución: Los cambios no se guardan en el editor de contenidos

## Problema
Cuando editas textos e imágenes en el modo de edición y cierras la sesión, los cambios no se guardan.

## Diagnóstico

### Paso 1: Verificar el estado de la tabla en Supabase

1. Abre tu navegador y ve a:
   ```
   http://localhost:3000/api/content/check-editable-content
   ```
   (O la URL de tu aplicación en producción)

2. Deberías ver una respuesta JSON que indica:
   - ✅ `tableExists: true` - La tabla existe
   - ✅ `canRead: true` - Puede leer de la tabla
   - ✅ `canWrite: true` - Puede escribir en la tabla

### Paso 2: Si la tabla NO existe

Si ves `tableExists: false`, necesitas crear la tabla en Supabase:

1. **Ve a tu proyecto en Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor:**
   - En el menú lateral, haz clic en **SQL Editor**
   - Haz clic en **New Query**

3. **Ejecuta el script de creación:**
   - Abre el archivo `supabase/create_editable_content_table.sql` en tu proyecto
   - Copia TODO el contenido del archivo
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **Run** (o presiona `Ctrl+Enter`)

4. **Verifica que se creó correctamente:**
   - Deberías ver un mensaje de éxito
   - Vuelve a verificar en: `http://localhost:3000/api/content/check-editable-content`
   - Ahora debería mostrar `tableExists: true`

### Paso 3: Si hay problemas de permisos

Si ves `canRead: false` o `canWrite: false`, ejecuta el script de actualización de políticas:

1. **En el SQL Editor de Supabase:**
   - Abre el archivo `supabase/update_editable_content_policies.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor
   - Ejecuta el script

2. **Verifica nuevamente:**
   - Vuelve a `http://localhost:3000/api/content/check-editable-content`
   - Debería mostrar `canRead: true` y `canWrite: true`

## Cómo funciona el sistema de guardado

1. **Cuando editas un texto:**
   - Haces doble clic en el texto
   - Editas el contenido
   - Haces clic en **Guardar** (o presionas `Ctrl+Enter`)
   - El contenido se guarda inmediatamente en la tabla `editable_content` de Supabase
   - Verás un mensaje verde "✅ Guardado" en la esquina superior derecha

2. **Cuando editas una imagen:**
   - Haces clic en la imagen
   - Seleccionas una nueva imagen
   - La imagen se sube a Supabase Storage
   - La URL de la imagen se guarda en la tabla `editable_content`
   - Verás un mensaje verde "✅ Imagen guardada"

3. **Cuando cierras la sesión:**
   - Los cambios YA están guardados en la base de datos
   - Al recargar la página, los componentes cargan automáticamente el contenido guardado
   - Si no ves los cambios, es porque la tabla no existe o hay un problema de permisos

## Verificación manual en Supabase

Puedes verificar manualmente si los cambios se están guardando:

1. **Ve a Supabase Dashboard → Table Editor**
2. **Busca la tabla `editable_content`**
3. **Deberías ver registros con:**
   - `key`: El identificador único del contenido (ej: "card-presencial-title")
   - `type`: El tipo de contenido ("text", "image", "video")
   - `content`: El contenido guardado
   - `updated_at`: La fecha de última actualización

## Solución de problemas comunes

### Error: "La tabla editable_content no existe"
**Solución:** Ejecuta el script `supabase/create_editable_content_table.sql` en Supabase

### Error: "Error de permisos"
**Solución:** Ejecuta el script `supabase/update_editable_content_policies.sql` en Supabase

### Los cambios se guardan pero no se muestran al recargar
**Posibles causas:**
1. El componente no está cargando el contenido guardado correctamente
2. Hay un error en la consola del navegador (presiona F12 para ver)
3. El `contentKey` no coincide entre el guardado y la carga

**Solución:**
- Abre la consola del navegador (F12)
- Busca errores en rojo
- Verifica que el `contentKey` sea el mismo en todos los lugares donde uses el mismo contenido editable

### No veo el mensaje "✅ Guardado"
**Solución:** Los mensajes de éxito aparecen en la esquina superior derecha por 2 segundos. Si no los ves, verifica:
- Que no haya errores en la consola
- Que la tabla exista y tenga permisos correctos
- Que la API esté respondiendo correctamente

## Prueba rápida

1. Activa el modo de edición (candado)
2. Edita un texto haciendo doble clic
3. Guarda los cambios
4. Deberías ver "✅ Guardado"
5. Recarga la página (F5)
6. El texto editado debería aparecer automáticamente

Si después de seguir estos pasos aún no funciona, revisa la consola del navegador (F12) y comparte los errores que veas.

