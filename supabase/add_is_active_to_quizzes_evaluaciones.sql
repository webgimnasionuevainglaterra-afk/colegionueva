-- Agregar campo is_active a la tabla quizzes
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Agregar campo is_active a la tabla evaluaciones_periodo
ALTER TABLE evaluaciones_periodo 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Comentarios para documentación
COMMENT ON COLUMN quizzes.is_active IS 'Indica si el quiz está activo y visible para los estudiantes';
COMMENT ON COLUMN evaluaciones_periodo.is_active IS 'Indica si la evaluación está activa y visible para los estudiantes';










