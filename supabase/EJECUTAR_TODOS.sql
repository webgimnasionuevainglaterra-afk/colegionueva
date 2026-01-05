-- ============================================
-- SCRIPT COMPLETO - EJECUTAR EN ORDEN
-- ============================================
-- Ejecuta este script completo en Supabase SQL Editor
-- O ejecuta cada sección por separado en el orden indicado
-- ============================================

-- ============================================
-- 1. ACTUALIZAR ESTRUCTURA DE MATERIAS
-- ============================================
-- Eliminar columnas que ya no se necesitan
ALTER TABLE materias DROP COLUMN IF EXISTS codigo;
ALTER TABLE materias DROP COLUMN IF EXISTS horas_semanales;

-- Agregar columna horas_totales
ALTER TABLE materias ADD COLUMN IF NOT EXISTS horas_totales INTEGER DEFAULT 0;

-- Actualizar constraint único (ya no incluye codigo)
ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_curso_id_nombre_key;
ALTER TABLE materias ADD CONSTRAINT materias_curso_id_nombre_key UNIQUE(curso_id, nombre);

-- ============================================
-- 2. CREAR TABLA DE PERIODOS
-- ============================================
CREATE TABLE IF NOT EXISTS periodos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  numero_periodo INTEGER NOT NULL CHECK (numero_periodo IN (1, 2, 3, 4)),
  nombre VARCHAR(100) NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(materia_id, numero_periodo)
);

ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden leer periodos"
  ON periodos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden crear periodos"
  ON periodos
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

CREATE POLICY "Solo super administradores pueden actualizar periodos"
  ON periodos
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

CREATE POLICY "Solo super administradores pueden eliminar periodos"
  ON periodos
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

CREATE INDEX IF NOT EXISTS idx_periodos_materia_id ON periodos(materia_id);
CREATE INDEX IF NOT EXISTS idx_periodos_numero ON periodos(numero_periodo);

CREATE TRIGGER update_periodos_updated_at
  BEFORE UPDATE ON periodos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. CREAR TABLA DE TEMAS
-- ============================================
CREATE TABLE IF NOT EXISTS temas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE temas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden leer temas"
  ON temas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden crear temas"
  ON temas
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

CREATE POLICY "Solo super administradores pueden actualizar temas"
  ON temas
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

CREATE POLICY "Solo super administradores pueden eliminar temas"
  ON temas
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

CREATE INDEX IF NOT EXISTS idx_temas_periodo_id ON temas(periodo_id);
CREATE INDEX IF NOT EXISTS idx_temas_orden ON temas(orden);

CREATE TRIGGER update_temas_updated_at
  BEFORE UPDATE ON temas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. CREAR TABLA DE SUBTEMAS
-- ============================================
CREATE TABLE IF NOT EXISTS subtemas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tema_id UUID NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE subtemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden leer subtemas"
  ON subtemas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden crear subtemas"
  ON subtemas
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

CREATE POLICY "Solo super administradores pueden actualizar subtemas"
  ON subtemas
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

CREATE POLICY "Solo super administradores pueden eliminar subtemas"
  ON subtemas
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

CREATE INDEX IF NOT EXISTS idx_subtemas_tema_id ON subtemas(tema_id);
CREATE INDEX IF NOT EXISTS idx_subtemas_orden ON subtemas(orden);

CREATE TRIGGER update_subtemas_updated_at
  BEFORE UPDATE ON subtemas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. CREAR TABLA DE CONTENIDO
-- ============================================
CREATE TABLE IF NOT EXISTS contenido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subtema_id UUID NOT NULL REFERENCES subtemas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('video', 'archivo', 'foro')),
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  url TEXT,
  archivo_url TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contenido ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios autenticados pueden leer contenido"
  ON contenido
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo super administradores pueden crear contenido"
  ON contenido
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

CREATE POLICY "Solo super administradores pueden actualizar contenido"
  ON contenido
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

CREATE POLICY "Solo super administradores pueden eliminar contenido"
  ON contenido
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

CREATE INDEX IF NOT EXISTS idx_contenido_subtema_id ON contenido(subtema_id);
CREATE INDEX IF NOT EXISTS idx_contenido_tipo ON contenido(tipo);
CREATE INDEX IF NOT EXISTS idx_contenido_orden ON contenido(orden);

CREATE TRIGGER update_contenido_updated_at
  BEFORE UPDATE ON contenido
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREAR TABLA DE PROFESORES Y PROFESORES_CURSOS
-- ============================================

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

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Verifica que todas las tablas se hayan creado correctamente
-- ejecutando: SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN 
-- ('cursos', 'materias', 'periodos', 'temas', 'subtemas', 'contenido', 'profesores', 'profesores_cursos');
-- ============================================

