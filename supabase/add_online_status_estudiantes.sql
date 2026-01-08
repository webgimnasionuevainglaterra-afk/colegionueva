-- Agregar columnas para rastrear el estado online/offline de estudiantes
ALTER TABLE estudiantes 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por estado online
CREATE INDEX IF NOT EXISTS idx_estudiantes_is_online ON estudiantes(is_online);

-- Agregar columnas para rastrear el estado online/offline de profesores
ALTER TABLE profesores 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por estado online
CREATE INDEX IF NOT EXISTS idx_profesores_is_online ON profesores(is_online);

