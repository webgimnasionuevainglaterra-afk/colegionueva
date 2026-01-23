-- Crear tabla de profesores
CREATE TABLE IF NOT EXISTS profesores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  apellido VARCHAR(255) NOT NULL,
  foto_url TEXT,
  numero_celular VARCHAR(20),
  indicativo_pais VARCHAR(5) DEFAULT '+57',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Crear tabla de relación profesores-cursos (muchos a muchos)
CREATE TABLE IF NOT EXISTS profesores_cursos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profesor_id UUID NOT NULL REFERENCES profesores(id) ON DELETE CASCADE,
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profesor_id, curso_id)
);

-- Habilitar RLS
ALTER TABLE profesores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesores_cursos ENABLE ROW LEVEL SECURITY;

-- Políticas para profesores
CREATE POLICY "Los usuarios autenticados pueden leer profesores"
  ON profesores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden crear profesores"
  ON profesores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

CREATE POLICY "Solo super administradores pueden actualizar profesores"
  ON profesores
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

CREATE POLICY "Solo super administradores pueden eliminar profesores"
  ON profesores
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

-- Políticas para profesores_cursos
CREATE POLICY "Los usuarios autenticados pueden leer profesores_cursos"
  ON profesores_cursos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden crear profesores_cursos"
  ON profesores_cursos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

CREATE POLICY "Solo super administradores pueden eliminar profesores_cursos"
  ON profesores_cursos
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42'
    OR EXISTS (
      SELECT 1 FROM administrators
      WHERE administrators.id = auth.uid()
      AND administrators.role = 'super_admin'
    )
  );

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_profesores_email ON profesores(email);
CREATE INDEX IF NOT EXISTS idx_profesores_cursos_profesor_id ON profesores_cursos(profesor_id);
CREATE INDEX IF NOT EXISTS idx_profesores_cursos_curso_id ON profesores_cursos(curso_id);

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_profesores_updated_at
  BEFORE UPDATE ON profesores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();







