-- Tabla de quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subtema_id UUID NOT NULL REFERENCES subtemas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tiempo_por_pregunta_segundos INTEGER NOT NULL DEFAULT 30,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creado_por UUID REFERENCES auth.users(id)
);

-- Tabla de preguntas
CREATE TABLE IF NOT EXISTS preguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  pregunta_texto TEXT NOT NULL,
  tiempo_segundos INTEGER NOT NULL DEFAULT 30,
  orden INTEGER NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de opciones de respuesta
CREATE TABLE IF NOT EXISTS opciones_respuesta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
  explicacion TEXT,
  orden INTEGER NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de intentos de quiz
CREATE TABLE IF NOT EXISTS intentos_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_fin TIMESTAMP WITH TIME ZONE,
  calificacion NUMERIC(3,2), -- 0.00 a 5.00
  completado BOOLEAN DEFAULT FALSE,
  UNIQUE(quiz_id, estudiante_id) -- Solo un intento por estudiante por quiz
);

-- Tabla de respuestas del estudiante
CREATE TABLE IF NOT EXISTS respuestas_estudiante (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intento_id UUID NOT NULL REFERENCES intentos_quiz(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  opcion_seleccionada_id UUID REFERENCES opciones_respuesta(id),
  tiempo_tomado_segundos INTEGER,
  es_correcta BOOLEAN,
  fecha_respuesta TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_quizzes_subtema_id ON quizzes(subtema_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_quiz_id ON preguntas(quiz_id);
CREATE INDEX IF NOT EXISTS idx_opciones_pregunta_id ON opciones_respuesta(pregunta_id);
CREATE INDEX IF NOT EXISTS idx_intentos_quiz_id ON intentos_quiz(quiz_id);
CREATE INDEX IF NOT EXISTS idx_intentos_estudiante_id ON intentos_quiz(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_intento_id ON respuestas_estudiante(intento_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_pregunta_id ON respuestas_estudiante(pregunta_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_estudiante ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden gestionar quizzes
-- (Las APIs del backend validarán permisos con service role key)
CREATE POLICY "Usuarios autenticados pueden gestionar quizzes"
ON quizzes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Todos pueden leer quizzes disponibles
CREATE POLICY "Todos pueden leer quizzes disponibles"
ON quizzes FOR SELECT
USING (true);

-- Política: Usuarios autenticados pueden gestionar preguntas
CREATE POLICY "Usuarios autenticados pueden gestionar preguntas"
ON preguntas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Todos pueden leer preguntas
CREATE POLICY "Todos pueden leer preguntas"
ON preguntas FOR SELECT
USING (true);

-- Política: Usuarios autenticados pueden gestionar opciones
CREATE POLICY "Usuarios autenticados pueden gestionar opciones"
ON opciones_respuesta FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Todos pueden leer opciones
CREATE POLICY "Todos pueden leer opciones"
ON opciones_respuesta FOR SELECT
USING (true);

-- Política: Estudiantes pueden crear sus propios intentos
CREATE POLICY "Estudiantes pueden crear sus intentos"
ON intentos_quiz FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = estudiante_id);

-- Política: Estudiantes pueden ver sus propios intentos
CREATE POLICY "Estudiantes pueden ver sus intentos"
ON intentos_quiz FOR SELECT
TO authenticated
USING (auth.uid() = estudiante_id);

-- Política: Estudiantes pueden actualizar sus intentos
CREATE POLICY "Estudiantes pueden actualizar sus intentos"
ON intentos_quiz FOR UPDATE
USING (auth.uid() = estudiante_id);

-- Política: Estudiantes pueden crear sus respuestas
CREATE POLICY "Estudiantes pueden crear sus respuestas"
ON respuestas_estudiante FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM intentos_quiz 
    WHERE intentos_quiz.id = intento_id 
    AND intentos_quiz.estudiante_id = auth.uid()
  )
);

-- Política: Estudiantes pueden ver sus respuestas
CREATE POLICY "Estudiantes pueden ver sus respuestas"
ON respuestas_estudiante FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM intentos_quiz 
    WHERE intentos_quiz.id = intento_id 
    AND intentos_quiz.estudiante_id = auth.uid()
  )
);

