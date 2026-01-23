-- ============================================
-- SCRIPT PARA CONSULTAR ESTRUCTURA DE TABLAS
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- para ver la estructura de las tablas existentes
-- ============================================

-- 1. Consultar estructura de mensajes_foro
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mensajes_foro'
ORDER BY ordinal_position;

-- 2. Consultar estructura de notificaciones
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notificaciones'
ORDER BY ordinal_position;

-- 3. Consultar constraints y foreign keys de mensajes_foro
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'mensajes_foro'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 4. Consultar constraints y foreign keys de notificaciones
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'notificaciones'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 5. Consultar índices de mensajes_foro
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'mensajes_foro';

-- 6. Consultar índices de notificaciones
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'notificaciones';

-- 7. Consultar políticas RLS de mensajes_foro
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'mensajes_foro';

-- 8. Consultar políticas RLS de notificaciones
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notificaciones';



