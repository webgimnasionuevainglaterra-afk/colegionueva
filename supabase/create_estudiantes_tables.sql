-- Tabla de acudientes
CREATE TABLE IF NOT EXISTS acudientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  correo_electronico VARCHAR(255) NOT NULL UNIQUE,
  numero_cedula VARCHAR(20) NOT NULL UNIQUE,
  numero_telefono VARCHAR(20),
  indicativo_pais VARCHAR(5) DEFAULT '+57', -- Indicativo de Colombia por defecto
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estudiantes
CREATE TABLE IF NOT EXISTS estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  foto_url TEXT,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  edad INTEGER,
  correo_electronico VARCHAR(255) NOT NULL UNIQUE,
  numero_telefono VARCHAR(20),
  indicativo_pais VARCHAR(5) DEFAULT '+57', -- Indicativo de Colombia por defecto
  tarjeta_identidad VARCHAR(20) NOT NULL UNIQUE,
  acudiente_id UUID REFERENCES acudientes(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Tabla de relación estudiantes-cursos (muchos a muchos)
CREATE TABLE IF NOT EXISTS estudiantes_cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(estudiante_id, curso_id) -- Un estudiante solo puede estar una vez en un curso
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_estudiantes_user_id ON estudiantes(user_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_correo ON estudiantes(correo_electronico);
CREATE INDEX IF NOT EXISTS idx_estudiantes_tarjeta_identidad ON estudiantes(tarjeta_identidad);
CREATE INDEX IF NOT EXISTS idx_estudiantes_acudiente_id ON estudiantes(acudiente_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_cursos_estudiante_id ON estudiantes_cursos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_cursos_curso_id ON estudiantes_cursos(curso_id);
CREATE INDEX IF NOT EXISTS idx_acudientes_correo ON acudientes(correo_electronico);
CREATE INDEX IF NOT EXISTS idx_acudientes_cedula ON acudientes(numero_cedula);

-- Políticas RLS (Row Level Security)
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE acudientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes_cursos ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden gestionar estudiantes
CREATE POLICY "Usuarios autenticados pueden gestionar estudiantes"
ON estudiantes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Estudiantes pueden ver sus propios datos
CREATE POLICY "Estudiantes pueden ver sus propios datos"
ON estudiantes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Usuarios autenticados pueden gestionar acudientes
CREATE POLICY "Usuarios autenticados pueden gestionar acudientes"
ON acudientes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Usuarios autenticados pueden gestionar asignaciones estudiantes-cursos
CREATE POLICY "Usuarios autenticados pueden gestionar asignaciones"
ON estudiantes_cursos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Estudiantes pueden ver sus cursos asignados
CREATE POLICY "Estudiantes pueden ver sus cursos"
ON estudiantes_cursos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM estudiantes 
    WHERE estudiantes.id = estudiantes_cursos.estudiante_id 
    AND estudiantes.user_id = auth.uid()
  )
);







