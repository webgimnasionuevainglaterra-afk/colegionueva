# Crear Bucket de Storage en Supabase

## ⚠️ Error: "Bucket not found"

Si estás viendo este error, significa que el bucket `avatars` no existe en Supabase Storage.

## Solución Rápida

### Opción 1: Crear el bucket desde el Dashboard (Recomendado)

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **Storage** en el menú lateral
3. Haz clic en **Buckets**
4. Haz clic en **New bucket**
5. Configura el bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Marca esta opción (para que las imágenes sean accesibles públicamente)
6. Haz clic en **Create bucket**

### Opción 2: Crear el bucket con SQL

1. Ve a **SQL Editor** en Supabase Dashboard
2. Copia y pega este código:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
```

3. Ejecuta el script

## Verificación

Después de crear el bucket:

1. Ve a **Storage** → **Buckets**
2. Verifica que exista el bucket `avatars`
3. Verifica que esté marcado como **Public**

## Nota

Si no creas el bucket, aún podrás crear administradores, pero **sin foto**. El sistema continuará funcionando normalmente, solo que no se subirán las imágenes.






