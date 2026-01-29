-- Tabla de evaluaciones del periodo
CREATE TABLE IF NOT EXISTS evaluaciones_periodo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tiempo_por_pregunta_segundos INTEGER NOT NULL DEFAULT 30,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creado_por UUID REFERENCES auth.users(id),
  UNIQUE(periodo_id, materia_id) -- Solo una evaluación por periodo por materia
);

-- Tabla de preguntas de evaluación
CREATE TABLE IF NOT EXISTS preguntas_evaluacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones_periodo(id) ON DELETE CASCADE,
  pregunta_texto TEXT NOT NULL,
  tiempo_segundos INTEGER NOT NULL DEFAULT 30,
  orden INTEGER NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de opciones de respuesta de evaluación
CREATE TABLE IF NOT EXISTS opciones_respuesta_evaluacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID NOT NULL REFERENCES preguntas_evaluacion(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
  explicacion TEXT,
  orden INTEGER NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de intentos de evaluación
CREATE TABLE IF NOT EXISTS intentos_evaluacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones_periodo(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_fin TIMESTAMP WITH TIME ZONE,
  calificacion NUMERIC(3,2), -- 0.00 a 5.00
  completado BOOLEAN DEFAULT FALSE,
  UNIQUE(evaluacion_id, estudiante_id) -- Solo un intento por estudiante por evaluación
);

-- Tabla de respuestas del estudiante en evaluación
CREATE TABLE IF NOT EXISTS respuestas_estudiante_evaluacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intento_id UUID NOT NULL REFERENCES intentos_evaluacion(id) ON DELETE CASCADE,
  pregunta_id UUID NOT NULL REFERENCES preguntas_evaluacion(id) ON DELETE CASCADE,
  opcion_seleccionada_id UUID REFERENCES opciones_respuesta_evaluacion(id),
  tiempo_tomado_segundos INTEGER,
  es_correcta BOOLEAN,
  fecha_respuesta TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_evaluaciones_periodo_id ON evaluaciones_periodo(periodo_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_materia_id ON evaluaciones_periodo(materia_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_evaluacion_id ON preguntas_evaluacion(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_opciones_evaluacion_pregunta_id ON opciones_respuesta_evaluacion(pregunta_id);
CREATE INDEX IF NOT EXISTS idx_intentos_evaluacion_id ON intentos_evaluacion(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_intentos_evaluacion_estudiante_id ON intentos_evaluacion(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_evaluacion_intento_id ON respuestas_estudiante_evaluacion(intento_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_evaluacion_pregunta_id ON respuestas_estudiante_evaluacion(pregunta_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE evaluaciones_periodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_respuesta_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_estudiante_evaluacion ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden gestionar evaluaciones
CREATE POLICY "Usuarios autenticados pueden gestionar evaluaciones"
ON evaluaciones_periodo FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Todos pueden leer evaluaciones disponibles
CREATE POLICY "Todos pueden leer evaluaciones disponibles"
ON evaluaciones_periodo FOR SELECT
USING (true);

-- Política: Usuarios autenticados pueden gestionar preguntas de evaluación
CREATE POLICY "Usuarios autenticados pueden gestionar preguntas de evaluación"
ON preguntas_evaluacion FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Todos pueden leer preguntas de evaluación
CREATE POLICY "Todos pueden leer preguntas de evaluación"
ON preguntas_evaluacion FOR SELECT
USING (true);

-- Política: Usuarios autenticados pueden gestionar opciones de evaluación
CREATE POLICY "Usuarios autenticados pueden gestionar opciones de evaluación"
ON opciones_respuesta_evaluacion FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Todos pueden leer opciones de evaluación
CREATE POLICY "Todos pueden leer opciones de evaluación"
ON opciones_respuesta_evaluacion FOR SELECT
USING (true);

-- Política: Estudiantes pueden crear sus propios intentos de evaluación
CREATE POLICY "Estudiantes pueden crear sus intentos de evaluación"
ON intentos_evaluacion FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = estudiante_id);

-- Política: Estudiantes pueden ver sus propios intentos de evaluación
CREATE POLICY "Estudiantes pueden ver sus intentos de evaluación"
ON intentos_evaluacion FOR SELECT
TO authenticated
USING (auth.uid() = estudiante_id);

-- Política: Estudiantes pueden actualizar sus intentos de evaluación
CREATE POLICY "Estudiantes pueden actualizar sus intentos de evaluación"
ON intentos_evaluacion FOR UPDATE
USING (auth.uid() = estudiante_id);

-- Política: Estudiantes pueden crear sus respuestas de evaluación
CREATE POLICY "Estudiantes pueden crear sus respuestas de evaluación"
ON respuestas_estudiante_evaluacion FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM intentos_evaluacion 
    WHERE intentos_evaluacion.id = intento_id 
    AND intentos_evaluacion.estudiante_id = auth.uid()
  )
);

-- Política: Estudiantes pueden ver sus respuestas de evaluación
CREATE POLICY "Estudiantes pueden ver sus respuestas de evaluación"
ON respuestas_estudiante_evaluacion FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM intentos_evaluacion 
    WHERE intentos_evaluacion.id = intento_id 
    AND intentos_evaluacion.estudiante_id = auth.uid()
  )
);











