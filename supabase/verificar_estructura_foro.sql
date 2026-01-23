-- ============================================
-- SCRIPT PARA VERIFICAR ESTRUCTURA DE TABLAS DE FORO
-- ============================================

-- Verificar estructura de mensajes_foro
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mensajes_foro'
ORDER BY ordinal_position;

-- Verificar si existe la columna contenido_id
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'mensajes_foro' 
    AND column_name = 'contenido_id'
) AS tiene_contenido_id;

-- Verificar si existe la columna tema_id (antigua)
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'mensajes_foro' 
    AND column_name = 'tema_id'
) AS tiene_tema_id;

-- Verificar estructura de notificaciones
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notificaciones'
ORDER BY ordinal_position;

-- Verificar si existe la columna mensaje_foro_id en notificaciones
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notificaciones' 
    AND column_name = 'mensaje_foro_id'
) AS tiene_mensaje_foro_id;



