-- ============================================
-- Script para agregar columnas de estado online/offline
-- a todas las tablas de usuarios
-- ============================================

-- Agregar columnas para rastrear el estado online/offline de administradores
ALTER TABLE administrators 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por estado online de administradores
CREATE INDEX IF NOT EXISTS idx_administrators_is_online ON administrators(is_online);

-- Agregar columnas para rastrear el estado online/offline de profesores
ALTER TABLE profesores 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por estado online de profesores
CREATE INDEX IF NOT EXISTS idx_profesores_is_online ON profesores(is_online);

-- Agregar columnas para rastrear el estado online/offline de estudiantes
ALTER TABLE estudiantes 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Crear índice para búsquedas por estado online de estudiantes
CREATE INDEX IF NOT EXISTS idx_estudiantes_is_online ON estudiantes(is_online);


