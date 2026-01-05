# Scripts SQL para Supabase

Este directorio contiene los scripts SQL necesarios para configurar la base de datos en Supabase.

## Instrucciones

### 1. Crear la tabla de administradores

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Crea una nueva consulta
4. Copia y pega el contenido de `create_administrators_table_clean.sql` (versión sin comentarios)
   - O usa `create_administrators_table.sql` si prefieres la versión con comentarios
5. Ejecuta el script

Este script creará:
- La tabla `administrators` con todos los campos necesarios
- Índices para optimizar búsquedas
- Políticas de seguridad (RLS) para proteger los datos
- Triggers para actualizar automáticamente el campo `updated_at`

### 2. Crear el bucket de storage para avatares

1. En el **SQL Editor** de Supabase
2. Copia y pega el contenido de `create_storage_bucket_clean.sql` (versión sin comentarios)
   - O usa `create_storage_bucket.sql` si prefieres la versión con comentarios
3. Ejecuta el script

Este script creará:
- El bucket `avatars` para almacenar las fotos de perfil
- Políticas de acceso público para lectura
- Políticas de acceso autenticado para subida/actualización/eliminación

### 3. Configurar variables de entorno

Asegúrate de tener configurado el archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pdhvrvawsguwnbnfokaa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**Importante**: El `SUPABASE_SERVICE_ROLE_KEY` es necesario para las operaciones de administración. Puedes encontrarlo en:
- Supabase Dashboard → Settings → API → Service Role Key

⚠️ **NUNCA** compartas o subas el Service Role Key a un repositorio público.

## Orden de ejecución

1. Primero ejecuta `create_administrators_table_clean.sql` (o `create_administrators_table.sql`)
2. Luego ejecuta `create_storage_bucket_clean.sql` (o `create_storage_bucket.sql`)
3. Opcional: Ejecuta `add_super_admin.sql` para agregar el usuario super administrador a la tabla

**Nota**: Si encuentras errores de sintaxis, usa las versiones `_clean.sql` que no tienen comentarios.

### Agregar Super Administrador

Si quieres que el usuario `webgimnasionuevainglaterra@gmail.com` aparezca en la lista de administradores:

1. Ejecuta el script `add_super_admin.sql` en el SQL Editor de Supabase
2. O usa el botón "Agregar Usuario Existente" en la interfaz del dashboard
3. El sistema también intentará agregarlo automáticamente si no existe cuando cargas la lista

## Verificación

Después de ejecutar los scripts, verifica:

1. **Tabla creada**: Ve a **Table Editor** y confirma que existe la tabla `administrators`
2. **Bucket creado**: Ve a **Storage** y confirma que existe el bucket `avatars`
3. **RLS habilitado**: En la tabla `administrators`, verifica que Row Level Security esté habilitado

## Notas

- El UID del super administrador está hardcodeado en las políticas: `dfdca86b-187f-49c2-8fe5-ee735a2a6d42`
- Si necesitas cambiar este UID, actualiza las políticas en `create_administrators_table.sql`

