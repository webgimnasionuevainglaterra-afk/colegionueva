-- Crear tabla para almacenar las matrículas presenciales
CREATE TABLE IF NOT EXISTS matriculas_presenciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_acudiente VARCHAR(255) NOT NULL,
  nombre_estudiante VARCHAR(255) NOT NULL,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  telefono_estudiante VARCHAR(20),
  estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'completada')),
  observaciones TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_matriculas_presenciales_curso ON matriculas_presenciales(curso_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_presenciales_estado ON matriculas_presenciales(estado);
CREATE INDEX IF NOT EXISTS idx_matriculas_presenciales_creado ON matriculas_presenciales(creado_en DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE matriculas_presenciales ENABLE ROW LEVEL SECURITY;

-- Política para que solo los administradores puedan ver todas las matrículas
CREATE POLICY "Administradores pueden ver todas las matrículas"
  ON matriculas_presenciales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
    )
  );

-- Política para que cualquiera pueda crear matrículas (público)
CREATE POLICY "Cualquiera puede crear matrículas"
  ON matriculas_presenciales
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para que solo los administradores puedan actualizar matrículas
CREATE POLICY "Administradores pueden actualizar matrículas"
  ON matriculas_presenciales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
    )
  );

-- Política para que solo los administradores puedan eliminar matrículas
CREATE POLICY "Administradores pueden eliminar matrículas"
  ON matriculas_presenciales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
    )
  );

-- Función para actualizar actualizado_en automáticamente
CREATE OR REPLACE FUNCTION actualizar_actualizado_en_matriculas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar actualizado_en
CREATE TRIGGER trigger_actualizar_actualizado_en_matriculas
  BEFORE UPDATE ON matriculas_presenciales
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_actualizado_en_matriculas();

