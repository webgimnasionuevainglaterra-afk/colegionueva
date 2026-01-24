-- ============================================
-- SCRIPT SIMPLE PARA ASIGNAR PROFESOR AL CURSO
-- ============================================
-- Curso: Segundo Primaria
-- Curso ID: 59953042-0b4d-4e16-8dfc-b4b28c0582df

-- PASO 1: Ver todos los profesores (ejecuta esto primero)
SELECT 
  id as profesor_id,
  nombre || ' ' || apellido as nombre_completo,
  email
FROM profesores
ORDER BY nombre;

-- PASO 2: Copia el "profesor_id" (columna id) del profesor que necesitas
-- y reemplázalo en el siguiente INSERT

-- PASO 3: Asignar el profesor al curso (reemplaza 'AQUI_VA_EL_PROFESOR_ID' con el id real)
INSERT INTO profesores_cursos (profesor_id, curso_id)
VALUES (
  'AQUI_VA_EL_PROFESOR_ID',  -- ⚠️ REEMPLAZAR con el profesor_id del PASO 1
  '59953042-0b4d-4e16-8dfc-b4b28c0582df'  -- Curso: Segundo Primaria
)
ON CONFLICT (profesor_id, curso_id) DO NOTHING;

-- PASO 4: Verificar que se asignó correctamente
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
WHERE c.id = '59953042-0b4d-4e16-8dfc-b4b28c0582df'
ORDER BY p.nombre;

