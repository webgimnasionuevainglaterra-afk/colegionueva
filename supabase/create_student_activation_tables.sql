-- ============================================
-- TABLAS PARA ACTIVACIÓN INDIVIDUAL DE QUIZZES Y EVALUACIONES
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- Crea las tablas necesarias para que los profesores puedan
-- activar/desactivar quizzes y evaluaciones por estudiante
-- ============================================

-- ============================================
-- 1. TABLA QUIZZES_ESTUDIANTES
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes_estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  fecha_activacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, estudiante_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_quizzes_estudiantes_quiz_id ON quizzes_estudiantes(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_estudiantes_estudiante_id ON quizzes_estudiantes(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_estudiantes_is_active ON quizzes_estudiantes(is_active);

-- Habilitar RLS
ALTER TABLE quizzes_estudiantes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS simplificadas - Los profesores autenticados pueden gestionar
-- La validación de permisos se hace en el backend (API routes)
CREATE POLICY "Usuarios autenticados pueden ver quizzes_estudiantes"
  ON quizzes_estudiantes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar quizzes_estudiantes"
  ON quizzes_estudiantes
  FOR ALL
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE quizzes_estudiantes IS 'Control de activación individual de quizzes por estudiante';
COMMENT ON COLUMN quizzes_estudiantes.is_active IS 'Indica si el quiz está activo para este estudiante específico';

-- ============================================
-- 2. TABLA EVALUACIONES_ESTUDIANTES
-- ============================================
CREATE TABLE IF NOT EXISTS evaluaciones_estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones_periodo(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  fecha_activacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evaluacion_id, estudiante_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estudiantes_evaluacion_id ON evaluaciones_estudiantes(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estudiantes_estudiante_id ON evaluaciones_estudiantes(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estudiantes_is_active ON evaluaciones_estudiantes(is_active);

-- Habilitar RLS
ALTER TABLE evaluaciones_estudiantes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS simplificadas - Los profesores autenticados pueden gestionar
-- La validación de permisos se hace en el backend (API routes)
CREATE POLICY "Usuarios autenticados pueden ver evaluaciones_estudiantes"
  ON evaluaciones_estudiantes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar evaluaciones_estudiantes"
  ON evaluaciones_estudiantes
  FOR ALL
  TO authenticated
  USING (true);

-- Comentarios
COMMENT ON TABLE evaluaciones_estudiantes IS 'Control de activación individual de evaluaciones por estudiante';
COMMENT ON COLUMN evaluaciones_estudiantes.is_active IS 'Indica si la evaluación está activa para este estudiante específico';

