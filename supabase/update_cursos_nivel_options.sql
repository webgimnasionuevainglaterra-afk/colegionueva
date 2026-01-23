-- Script para actualizar las opciones de nivel en la tabla cursos
-- Si ya ejecutaste create_cursos_table.sql, ejecuta este script para agregar las nuevas opciones

-- Eliminar el constraint anterior
ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_nivel_check;

-- Agregar el nuevo constraint con todas las opciones
ALTER TABLE cursos ADD CONSTRAINT cursos_nivel_check 
  CHECK (nivel IN ('Primaria', 'Bachillerato', 'Técnico', 'Profesional'));






