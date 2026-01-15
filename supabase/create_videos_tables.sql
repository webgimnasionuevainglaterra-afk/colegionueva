-- Tabla para videos de cursos (gestionados por profesores)
CREATE TABLE IF NOT EXISTS videos_cursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  descripcion TEXT,
  creado_por UUID REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(curso_id, profesor_id) -- Un profesor solo puede tener un video por curso
);

-- Tabla para video global (gestionado por super administrador)
CREATE TABLE IF NOT EXISTS video_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  descripcion TEXT,
  creado_por UUID REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_videos_cursos_curso_id ON videos_cursos(curso_id);
CREATE INDEX IF NOT EXISTS idx_videos_cursos_profesor_id ON videos_cursos(profesor_id);

-- RLS Policies para videos_cursos
ALTER TABLE videos_cursos ENABLE ROW LEVEL SECURITY;

-- Los profesores pueden ver sus propios videos
CREATE POLICY "Profesores pueden ver sus videos"
  ON videos_cursos FOR SELECT
  USING (
    videos_cursos.profesor_id = auth.uid()
  );

-- Los profesores pueden insertar sus propios videos
CREATE POLICY "Profesores pueden insertar sus videos"
  ON videos_cursos FOR INSERT
  WITH CHECK (
    videos_cursos.profesor_id = auth.uid()
  );

-- Los profesores pueden actualizar sus propios videos
CREATE POLICY "Profesores pueden actualizar sus videos"
  ON videos_cursos FOR UPDATE
  USING (
    videos_cursos.profesor_id = auth.uid()
  );

-- Los profesores pueden eliminar sus propios videos
CREATE POLICY "Profesores pueden eliminar sus videos"
  ON videos_cursos FOR DELETE
  USING (
    videos_cursos.profesor_id = auth.uid()
  );

-- Los estudiantes pueden ver videos de sus cursos asignados
CREATE POLICY "Estudiantes pueden ver videos de sus cursos"
  ON videos_cursos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estudiantes_cursos ec
      INNER JOIN estudiantes e ON e.id = ec.estudiante_id
      WHERE ec.curso_id = videos_cursos.curso_id
      AND e.user_id = auth.uid()
    )
  );

-- RLS Policies para video_global
ALTER TABLE video_global ENABLE ROW LEVEL SECURITY;

-- Solo super administradores pueden ver/editar el video global
CREATE POLICY "Super admin puede ver video global"
  ON video_global FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin puede insertar video global"
  ON video_global FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin puede actualizar video global"
  ON video_global FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin puede eliminar video global"
  ON video_global FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

-- Los estudiantes pueden ver el video global
CREATE POLICY "Estudiantes pueden ver video global"
  ON video_global FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estudiantes
      WHERE estudiantes.user_id = auth.uid()
    )
  );

