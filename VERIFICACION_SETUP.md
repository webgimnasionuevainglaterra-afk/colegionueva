# Verificación de Configuración - Crear Administradores

## ✅ Checklist de Verificación

### 1. Tabla `administrators` en Supabase

Verifica que la tabla tenga **TODAS** estas columnas:

- ✅ `id` (UUID, Primary Key)
- ✅ `email` (VARCHAR, UNIQUE, NOT NULL)
- ✅ `password_hash` (TEXT, NOT NULL)
- ✅ `nombre` (VARCHAR, NOT NULL)
- ✅ `apellido` (VARCHAR, NOT NULL)
- ✅ `foto_url` (TEXT, nullable)
- ✅ `role` (VARCHAR, DEFAULT 'administrator')
- ✅ `created_at` (TIMESTAMP)
- ✅ `updated_at` (TIMESTAMP)
- ✅ `created_by` (UUID, referencia a auth.users)
- ✅ `is_active` (BOOLEAN, DEFAULT true)

**Si faltan columnas**, ejecuta este SQL en Supabase SQL Editor:

```sql
-- Agregar columnas faltantes (ajusta según lo que falte)
ALTER TABLE administrators 
ADD COLUMN IF NOT EXISTS nombre VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS apellido VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'administrator',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

### 2. Row Level Security (RLS)

En la tabla `administrators`, verifica que:
- ✅ RLS esté **habilitado** (no debe aparecer el botón "Enable RLS")
- ✅ Existan **4 políticas** (SELECT, INSERT, UPDATE, DELETE)

**Si RLS no está habilitado**, ejecuta:

```sql
ALTER TABLE administrators ENABLE ROW LEVEL SECURITY;
```

### 3. Bucket de Storage `avatars`

Verifica en **Storage** → **Buckets** que exista:
- ✅ Bucket llamado `avatars`
- ✅ Debe estar marcado como **público**

**Si no existe**, ejecuta el script `create_storage_bucket_clean.sql` en SQL Editor.

### 4. Variables de Entorno

Verifica que el archivo `.env.local` exista en la raíz del proyecto con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pdhvrvawsguwnbnfokaa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Importante**: Después de crear/actualizar `.env.local`, **reinicia el servidor**:
```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

### 5. Probar el Formulario

1. Ve a `http://localhost:3003/dashboard`
2. Haz clic en **Gestionar Usuarios** → **Crear Administradores**
3. Completa el formulario:
   - Nombre: (obligatorio)
   - Apellido: (obligatorio)
   - Correo: (obligatorio, debe ser único)
   - Contraseña: (mínimo 6 caracteres)
   - Foto: (opcional)
4. Haz clic en **Crear Administrador**

### 6. Verificar Resultado

Después de crear un administrador, verifica:

1. **En Supabase Auth**:
   - Ve a **Authentication** → **Users**
   - Debe aparecer el nuevo usuario con el email ingresado
   - El email debe estar **confirmado** (email_confirm: true)

2. **En la tabla `administrators`**:
   - Ve a **Table Editor** → `administrators`
   - Debe aparecer una nueva fila con los datos ingresados
   - El `id` debe coincidir con el `id` del usuario en Auth

3. **En Storage** (si subiste foto):
   - Ve a **Storage** → **avatars** → **administrators**
   - Debe aparecer la imagen subida

## 🔧 Solución de Problemas

### Error: "SUPABASE_SERVICE_ROLE_KEY no está configurado"
- Verifica que `.env.local` exista y tenga la variable
- Reinicia el servidor después de crear/actualizar `.env.local`

### Error: "Faltan campos requeridos"
- Verifica que todos los campos obligatorios estén completos
- Verifica que la contraseña tenga al menos 6 caracteres

### Error: "Error al insertar en tabla administrators"
- Verifica que la tabla tenga todas las columnas necesarias
- Verifica que RLS esté habilitado y las políticas existan
- Verifica que el email no esté duplicado

### Error: "Error al subir la imagen"
- Verifica que el bucket `avatars` exista en Storage
- Verifica que el bucket esté configurado como público

### La tabla solo muestra algunas columnas
- En el Table Editor, haz clic en el icono de configuración (⚙️) para mostrar/ocultar columnas
- O ejecuta el SQL de agregar columnas faltantes

