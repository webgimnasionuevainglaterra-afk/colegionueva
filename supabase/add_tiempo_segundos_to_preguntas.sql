-- Agregar columna tiempo_segundos a la tabla preguntas si no existe
-- Ejecutar este script si ya creaste las tablas antes de agregar este campo

ALTER TABLE preguntas 
ADD COLUMN IF NOT EXISTS tiempo_segundos INTEGER NOT NULL DEFAULT 30;

-- Actualizar preguntas existentes que no tengan tiempo_segundos
UPDATE preguntas 
SET tiempo_segundos = 30 
WHERE tiempo_segundos IS NULL;










