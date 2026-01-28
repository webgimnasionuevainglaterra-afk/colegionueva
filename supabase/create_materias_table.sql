-- Crear tabla de materias
CREATE TABLE IF NOT EXISTS materias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50),
  descripcion TEXT,
  horas_semanales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(curso_id, nombre)
);

-- Habilitar RLS
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Los usuarios autenticados pueden leer materias"
  ON materias
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserción solo a super administradores
CREATE POLICY "Solo super administradores pueden crear materias"
  ON materias
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
CREATE POLICY "Solo super administradores pueden actualizar materias"
  ON materias
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
CREATE POLICY "Solo super administradores pueden eliminar materias"
  ON materias
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
CREATE INDEX IF NOT EXISTS idx_materias_curso_id ON materias(curso_id);
CREATE INDEX IF NOT EXISTS idx_materias_nombre ON materias(nombre);

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_materias_updated_at
  BEFORE UPDATE ON materias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();









