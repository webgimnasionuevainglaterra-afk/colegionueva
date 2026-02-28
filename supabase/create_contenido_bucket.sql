-- Crear bucket de storage para contenido (archivos, imágenes, PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contenido', 'contenido', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir lectura pública
CREATE POLICY "Public Access - Contenido"
ON storage.objects FOR SELECT
USING (bucket_id = 'contenido');

-- Política para permitir subida de archivos (solo autenticados)
CREATE POLICY "Authenticated users can upload contenido"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contenido' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir actualización (solo autenticados)
CREATE POLICY "Authenticated users can update contenido"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contenido' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir eliminación (solo autenticados)
CREATE POLICY "Authenticated users can delete contenido"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contenido' 
  AND auth.role() = 'authenticated'
);
















