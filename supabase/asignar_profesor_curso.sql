-- ============================================
-- SCRIPT PARA ASIGNAR PROFESOR AL CURSO
-- ============================================
-- Este script asigna el profesor al curso "Segundo Primaria"
-- Curso ID: 59953042-0b4d-4e16-8dfc-b4b28c0582df

-- PASO 1: Ver todos los profesores para identificar cuál necesitas
SELECT 
  id as profesor_id,
  nombre || ' ' || apellido as nombre_completo,
  email,
  created_at
FROM profesores
ORDER BY nombre;

-- PASO 2: Buscar un profesor específico por email
-- (Ejecuta esta consulta reemplazando el email)
SELECT 
  id as profesor_id,
  nombre || ' ' || apellido as nombre_completo,
  email
FROM profesores
WHERE email = 'EMAIL_DEL_PROFESOR';  -- ⚠️ REEMPLAZAR con el email del profesor

-- PASO 3: Asignar el profesor al curso "Segundo Primaria"
-- ⚠️ IMPORTANTE: Reemplaza 'PROFESOR_ID_AQUI' con el profesor_id obtenido en PASO 2
-- El profesor_id es el campo "id" de la tabla profesores (NO el user_id)
INSERT INTO profesores_cursos (profesor_id, curso_id)
VALUES (
  'PROFESOR_ID_AQUI',  -- ⚠️ REEMPLAZAR: Usa el id de la tabla profesores (no user_id)
  '59953042-0b4d-4e16-8dfc-b4b28c0582df'  -- Curso: Segundo Primaria
)
ON CONFLICT (profesor_id, curso_id) DO NOTHING;

-- PASO 4: Verificar que la asignación se creó correctamente
SELECT 
  p.id as profesor_id,
  p.nombre || ' ' || p.apellido as profesor_nombre,
  p.email,
  c.id as curso_id,
  c.nombre as curso_nombre,
  '✅ Asignado correctamente' as estado
FROM profesores p
JOIN profesores_cursos pc ON pc.profesor_id = p.id
JOIN cursos c ON c.id = pc.curso_id
WHERE c.id = '59953042-0b4d-4e16-8dfc-b4b28c0582df'  -- Curso: Segundo Primaria
ORDER BY p.nombre;

