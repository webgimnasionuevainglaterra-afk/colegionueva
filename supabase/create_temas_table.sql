-- Crear tabla de temas
CREATE TABLE IF NOT EXISTS temas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE temas ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Los usuarios autenticados pueden leer temas"
  ON temas
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserción solo a super administradores
CREATE POLICY "Solo super administradores pueden crear temas"
  ON temas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

-- Política para permitir actualización solo a super administradores
CREATE POLICY "Solo super administradores pueden actualizar temas"
  ON temas
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

-- Política para permitir eliminación solo a super administradores
CREATE POLICY "Solo super administradores pueden eliminar temas"
  ON temas
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_temas_periodo_id ON temas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_temas_orden ON temas(orden);

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_temas_updated_at
  BEFORE UPDATE ON temas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();











