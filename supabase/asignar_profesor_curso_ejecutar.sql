-- ============================================
-- ASIGNAR PROFESOR AL CURSO "Segundo Primaria"
-- ============================================
-- Curso ID: 59953042-0b4d-4e16-8dfc-b4b28c0582df

-- OPCIÓN 1: Asignar Diana Rodriguez al curso
INSERT INTO profesores_cursos (profesor_id, curso_id)
VALUES (
  'a28a86eb-dfdd-42f2-bdaf-dd524c20b363',  -- Diana Rodriguez
  '59953042-0b4d-4e16-8dfc-b4b28c0582df'   -- Segundo Primaria
)
ON CONFLICT (profesor_id, curso_id) DO NOTHING;

-- OPCIÓN 2: Asignar Juan camilo moreno al curso
INSERT INTO profesores_cursos (profesor_id, curso_id)
VALUES (
  'ed0d6590-6991-4db6-b59e-abf567b29eaa',  -- Juan camilo moreno
  '59953042-0b4d-4e16-8dfc-b4b28c0582df'   -- Segundo Primaria
)
ON CONFLICT (profesor_id, curso_id) DO NOTHING;

-- OPCIÓN 3: Asignar AMBOS profesores al curso (ejecuta ambas opciones 1 y 2)

-- Verificar asignaciones después de ejecutar
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

