-- Crear bucket para fotos de estudiantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir lectura pública
CREATE POLICY "Public Access for fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos');

-- Política para permitir subida de archivos (solo autenticados)
CREATE POLICY "Authenticated users can upload to fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fotos'
  AND auth.role() = 'authenticated'
);

-- Política para permitir actualización (solo autenticados)
CREATE POLICY "Authenticated users can update fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fotos'
  AND auth.role() = 'authenticated'
);

-- Política para permitir eliminación (solo autenticados)
CREATE POLICY "Authenticated users can delete fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fotos'
  AND auth.role() = 'authenticated'
);





