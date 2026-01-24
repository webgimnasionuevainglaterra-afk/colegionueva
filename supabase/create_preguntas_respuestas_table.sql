-- ============================================
-- TABLA PARA PREGUNTAS Y RESPUESTAS SIMPLE
-- ============================================
-- Sistema simple: estudiantes hacen preguntas, profesores responden

CREATE TABLE IF NOT EXISTS preguntas_respuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contenido_id UUID NOT NULL REFERENCES contenido(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL, -- user.id de auth.users
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pregunta', 'respuesta')), -- 'pregunta' o 'respuesta'
  pregunta_id UUID REFERENCES preguntas_respuestas(id) ON DELETE CASCADE, -- NULL si es pregunta, UUID de pregunta si es respuesta
  texto TEXT NOT NULL,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  eliminado BOOLEAN DEFAULT false
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_preguntas_respuestas_contenido_id ON preguntas_respuestas(contenido_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_respuestas_pregunta_id ON preguntas_respuestas(pregunta_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_respuestas_autor_id ON preguntas_respuestas(autor_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_respuestas_tipo ON preguntas_respuestas(tipo);
CREATE INDEX IF NOT EXISTS idx_preguntas_respuestas_eliminado ON preguntas_respuestas(eliminado);

-- Habilitar RLS
ALTER TABLE preguntas_respuestas ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer preguntas y respuestas
CREATE POLICY "Usuarios autenticados pueden leer preguntas_respuestas"
  ON preguntas_respuestas
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Estudiantes pueden crear preguntas
CREATE POLICY "Estudiantes pueden crear preguntas"
  ON preguntas_respuestas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tipo = 'pregunta' AND
    EXISTS (
      SELECT 1 FROM estudiantes
      WHERE estudiantes.user_id = auth.uid()
    )
  );

-- Política: Profesores pueden crear respuestas
CREATE POLICY "Profesores pueden crear respuestas"
  ON preguntas_respuestas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tipo = 'respuesta' AND
    EXISTS (
      SELECT 1 FROM profesores
      WHERE profesores.id = auth.uid()
    )
  );

-- Política: Usuarios pueden editar sus propios mensajes
CREATE POLICY "Usuarios pueden editar sus propios mensajes"
  ON preguntas_respuestas
  FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid())
  WITH CHECK (autor_id = auth.uid());

-- Política: Usuarios pueden eliminar sus propios mensajes (soft delete)
CREATE POLICY "Usuarios pueden eliminar sus propios mensajes"
  ON preguntas_respuestas
  FOR UPDATE
  TO authenticated
  USING (autor_id = auth.uid())
  WITH CHECK (autor_id = auth.uid());

-- Comentarios
COMMENT ON TABLE preguntas_respuestas IS 'Sistema simple de preguntas y respuestas por contenido';
COMMENT ON COLUMN preguntas_respuestas.tipo IS 'Tipo: pregunta (estudiante) o respuesta (profesor)';
COMMENT ON COLUMN preguntas_respuestas.pregunta_id IS 'NULL si es pregunta, UUID de la pregunta si es respuesta';

