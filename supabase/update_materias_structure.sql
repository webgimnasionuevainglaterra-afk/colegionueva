-- Actualizar estructura de materias
-- Eliminar columnas que ya no se necesitan
ALTER TABLE materias DROP COLUMN IF EXISTS codigo;
ALTER TABLE materias DROP COLUMN IF EXISTS horas_semanales;

-- Agregar columna horas_totales
ALTER TABLE materias ADD COLUMN IF NOT EXISTS horas_totales INTEGER DEFAULT 0;

-- Actualizar constraint único (ya no incluye codigo)
ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_curso_id_nombre_key;
ALTER TABLE materias ADD CONSTRAINT materias_curso_id_nombre_key UNIQUE(curso_id, nombre);





