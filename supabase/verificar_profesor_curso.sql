-- Script para verificar la asignación de profesores a cursos
-- Ejecutar en Supabase SQL Editor

-- 1. Ver todos los profesores y sus cursos asignados
SELECT 
  p.id as profesor_id,
  p.nombre || ' ' || p.apellido as profesor_nombre,
  p.email,
  c.id as curso_id,
  c.nombre as curso_nombre,
  c.nivel
FROM profesores p
LEFT JOIN profesores_cursos pc ON pc.profesor_id = p.id
LEFT JOIN cursos c ON c.id = pc.curso_id
ORDER BY p.nombre, c.nombre;

-- 2. Ver el contenido específico y su curso
SELECT 
  cont.id as contenido_id,
  cont.titulo,
  m.id as materia_id,
  m.nombre as materia_nombre,
  c.id as curso_id,
  c.nombre as curso_nombre
FROM contenido cont
JOIN subtemas st ON st.id = cont.subtema_id
JOIN temas t ON t.id = st.tema_id
JOIN periodos p ON p.id = t.periodo_id
JOIN materias m ON m.id = p.materia_id
JOIN cursos c ON c.id = m.curso_id
WHERE cont.id = '50cae878-c2e0-4373-9b0e-73c1495264f8';

-- 3. Obtener el profesor_id desde el email
-- Reemplazar 'EMAIL_DEL_PROFESOR' con el email del profesor que está intentando acceder
SELECT 
  p.id as profesor_id,
  p.nombre || ' ' || p.apellido as profesor_nombre,
  p.email
FROM profesores p
WHERE p.email = 'EMAIL_DEL_PROFESOR';  -- Reemplazar con el email real del profesor

-- 4. Asignar el profesor al curso del contenido
-- IMPORTANTE: Reemplazar 'PROFESOR_ID' con el id de la tabla profesores (no el user_id)
-- IMPORTANTE: Reemplazar 'CURSO_ID' con el curso_id obtenido de la consulta 2
-- El curso_id del contenido es: 59953042-0b4d-4e16-8dfc-b4b28c0582df (Segundo Primaria)
INSERT INTO profesores_cursos (profesor_id, curso_id)
VALUES (
  'PROFESOR_ID',  -- Reemplazar con el profesor_id obtenido de la consulta 3
  '59953042-0b4d-4e16-8dfc-b4b28c0582df'  -- Curso_id del contenido (Segundo Primaria)
)
ON CONFLICT (profesor_id, curso_id) DO NOTHING;

-- 5. Verificar la asignación después de insertar
SELECT 
  p.id as profesor_id,
  p.nombre || ' ' || p.apellido as profesor_nombre,
  c.id as curso_id,
  c.nombre as curso_nombre,
  'SÍ tiene acceso' as estado
FROM profesores p
JOIN profesores_cursos pc ON pc.profesor_id = p.id
JOIN cursos c ON c.id = pc.curso_id
WHERE c.id = '59953042-0b4d-4e16-8dfc-b4b28c0582df';  -- Curso del contenido

