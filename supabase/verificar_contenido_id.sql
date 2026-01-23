-- ============================================
-- VERIFICAR COLUMNA contenido_id EN mensajes_foro
-- ============================================

-- Verificar si existe la columna contenido_id en mensajes_foro
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'mensajes_foro' 
    AND column_name = 'contenido_id'
) AS tiene_contenido_id;

-- Ver todas las columnas de mensajes_foro
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mensajes_foro'
ORDER BY ordinal_position;


