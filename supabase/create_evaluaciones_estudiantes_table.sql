-- Tabla para activación individual de evaluaciones por estudiante
-- Permite que un profesor active/desactive una evaluación para estudiantes específicos
-- después de la fecha fin programada
CREATE TABLE IF NOT EXISTS evaluaciones_estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones_periodo(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  fecha_activacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evaluacion_id, estudiante_id) -- Solo un registro por evaluación-estudiante
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estudiantes_evaluacion_id ON evaluaciones_estudiantes(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estudiantes_estudiante_id ON evaluaciones_estudiantes(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estudiantes_is_active ON evaluaciones_estudiantes(is_active);

-- Comentarios para documentación
COMMENT ON TABLE evaluaciones_estudiantes IS 'Control de activación individual de evaluaciones por estudiante. Permite activar/desactivar evaluaciones después de la fecha fin para estudiantes específicos.';
COMMENT ON COLUMN evaluaciones_estudiantes.is_active IS 'Indica si la evaluación está activa para este estudiante específico';
COMMENT ON COLUMN evaluaciones_estudiantes.activado_por IS 'ID del profesor o administrador que activó/desactivó la evaluación para este estudiante';


