-- Agregar campo sexo a la tabla estudiantes
ALTER TABLE estudiantes 
ADD COLUMN IF NOT EXISTS sexo VARCHAR(10) CHECK (sexo IN ('masculino', 'femenino'));
















