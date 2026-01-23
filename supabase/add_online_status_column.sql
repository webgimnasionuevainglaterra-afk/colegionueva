-- Agregar columnas para rastrear el estado online/offline
ALTER TABLE administrators 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por estado online
CREATE INDEX IF NOT EXISTS idx_administrators_is_online ON administrators(is_online);







