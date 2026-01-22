-- Tabla para activación individual de quizzes por estudiante
-- Permite que un profesor active/desactive un quiz para estudiantes específicos
-- después de la fecha fin programada
CREATE TABLE IF NOT EXISTS quizzes_estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  fecha_activacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, estudiante_id) -- Solo un registro por quiz-estudiante
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_quizzes_estudiantes_quiz_id ON quizzes_estudiantes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_estudiantes_estudiante_id ON quizzes_estudiantes(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_estudiantes_is_active ON quizzes_estudiantes(is_active);

-- Comentarios para documentación
COMMENT ON TABLE quizzes_estudiantes IS 'Control de activación individual de quizzes por estudiante. Permite activar/desactivar quizzes después de la fecha fin para estudiantes específicos.';
COMMENT ON COLUMN quizzes_estudiantes.is_active IS 'Indica si el quiz está activo para este estudiante específico';
COMMENT ON COLUMN quizzes_estudiantes.activado_por IS 'ID del profesor o administrador que activó/desactivó el quiz para este estudiante';

