# Instrucciones para Crear la Tabla editable_content

## Paso 1: Acceder a Supabase

1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor** (ícono de base de datos en el menú lateral)

## Paso 2: Ejecutar el Script SQL

1. Copia todo el contenido del archivo `supabase/create_editable_content_table.sql`
2. Pégalo en el editor SQL de Supabase
3. Haz clic en **Run** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

## Paso 3: Verificar que se Creó Correctamente

Ejecuta esta consulta para verificar:

```sql
SELECT * FROM editable_content;
```

Si no hay errores, deberías ver una tabla vacía (sin filas, pero con la estructura creada).

## Solución de Problemas

### Error: "relation already exists"
- La tabla ya existe. Puedes eliminarla primero con:
```sql
DROP TABLE IF EXISTS editable_content CASCADE;
```
- Luego ejecuta el script completo nuevamente.

### Error: "permission denied"
- Asegúrate de estar usando una cuenta con permisos de administrador en Supabase.

### Error: "function does not exist"
- Ejecuta el script completo, incluyendo la creación de la función y el trigger.

## Nota Importante

La tabla `editable_content` permite operaciones desde el servicio admin (SERVICE_ROLE_KEY) sin necesidad de autenticación de usuario, ya que solo se accede desde las rutas API del servidor.

