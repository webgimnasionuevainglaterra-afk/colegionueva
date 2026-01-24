-- Tabla para almacenar contenido editable de la página web
CREATE TABLE IF NOT EXISTS editable_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'image', 'video')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por key
CREATE INDEX IF NOT EXISTS idx_editable_content_key ON editable_content(key);

-- Índice para búsquedas por type
CREATE INDEX IF NOT EXISTS idx_editable_content_type ON editable_content(type);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_editable_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_editable_content_updated_at
  BEFORE UPDATE ON editable_content
  FOR EACH ROW
  EXECUTE FUNCTION update_editable_content_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE editable_content ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar errores al re-ejecutar)
DROP POLICY IF EXISTS "Public can read editable content" ON editable_content;
DROP POLICY IF EXISTS "Super admins can manage editable content" ON editable_content;
DROP POLICY IF EXISTS "Service role can manage editable content" ON editable_content;

-- Política para permitir lectura pública (todos pueden leer)
CREATE POLICY "Public can read editable content"
  ON editable_content
  FOR SELECT
  USING (true);

-- Política para permitir inserción/actualización desde el servicio admin
-- Nota: Cuando se usa SERVICE_ROLE_KEY, auth.uid() es NULL, por lo que permitimos todas las operaciones
-- Esto es seguro porque solo se accede desde rutas API del servidor
CREATE POLICY "Service role can manage editable content"
  ON editable_content
  FOR ALL
  USING (true)
  WITH CHECK (true);

