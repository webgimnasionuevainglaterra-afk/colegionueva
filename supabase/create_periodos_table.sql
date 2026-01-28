-- Crear tabla de periodos
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

-- Habilitar RLS
ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Los usuarios autenticados pueden leer periodos"
  ON periodos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserción solo a super administradores
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

-- Política para permitir actualización solo a super administradores
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

-- Política para permitir eliminación solo a super administradores
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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_periodos_materia_id ON periodos(materia_id);
CREATE INDEX IF NOT EXISTS idx_periodos_numero ON periodos(numero_periodo);

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_periodos_updated_at
  BEFORE UPDATE ON periodos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();









