-- ============================================
-- SCRIPT PARA AJUSTAR TABLAS DEL FORO
-- ============================================
-- Este script ajusta las tablas mensajes_foro y notificaciones
-- para que funcionen con contenido_id en lugar de tema_id
-- ============================================

-- ============================================
-- 1. AJUSTAR TABLA mensajes_foro
-- ============================================

-- Paso 1: Agregar nuevas columnas necesarias
ALTER TABLE mensajes_foro 
ADD COLUMN IF NOT EXISTS contenido_id UUID REFERENCES contenido(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS es_pregunta BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS respondido BOOLEAN DEFAULT false;

-- Paso 2: Migrar datos de tema_id a contenido_id (si hay datos existentes)
-- NOTA: Esto requiere que exista una relación entre temas y contenido
-- Si no existe contenido relacionado, los mensajes existentes quedarán con contenido_id NULL
-- y deberán ser migrados manualmente o eliminados

-- Primero, intentar migrar datos existentes basándose en la relación:
-- tema -> subtemas -> contenido
UPDATE mensajes_foro mf
SET contenido_id = (
    SELECT c.id 
    FROM contenido c
    INNER JOIN subtemas s ON c.subtema_id = s.id
    INNER JOIN temas t ON s.tema_id = t.id
    WHERE t.id = mf.tema_id
    LIMIT 1
)
WHERE mf.tema_id IS NOT NULL 
  AND mf.contenido_id IS NULL;

-- Paso 3: Eliminar la columna tema_id (solo después de migrar los datos)
-- IMPORTANTE: Descomenta esta línea solo después de verificar que la migración fue exitosa
-- ALTER TABLE mensajes_foro DROP COLUMN IF EXISTS tema_id;

-- Paso 4: Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_mensajes_foro_contenido_id ON mensajes_foro(contenido_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_foro_autor_id ON mensajes_foro(autor_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_foro_respuesta_a ON mensajes_foro(respuesta_a);
CREATE INDEX IF NOT EXISTS idx_mensajes_foro_es_pregunta ON mensajes_foro(es_pregunta) WHERE es_pregunta = true;
CREATE INDEX IF NOT EXISTS idx_mensajes_foro_respondido ON mensajes_foro(respondido) WHERE respondido = false;

-- ============================================
-- 2. AJUSTAR TABLA notificaciones
-- ============================================

-- Paso 1: Agregar nuevas columnas necesarias
ALTER TABLE notificaciones
ADD COLUMN IF NOT EXISTS mensaje_foro_id UUID REFERENCES mensajes_foro(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS contenido_id UUID REFERENCES contenido(id) ON DELETE CASCADE;

-- Paso 2: Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_id ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_mensaje_foro_id ON notificaciones(mensaje_foro_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_contenido_id ON notificaciones(contenido_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida) WHERE leida = false;

-- Paso 3: Actualizar el campo 'tipo' para incluir los nuevos tipos de notificación
-- Los tipos existentes se mantienen, pero ahora también soportamos:
-- 'pregunta_sin_respuesta' - Cuando un estudiante hace una pregunta sin respuesta del profesor
-- 'respuesta_profesor' - Cuando el profesor responde a una pregunta
-- 'nueva_respuesta' - Cuando hay una nueva respuesta en un hilo
-- 'foro_mensaje' - Se mantiene para compatibilidad

-- ============================================
-- 3. ACTUALIZAR POLÍTICAS RLS (si es necesario)
-- ============================================

-- Las políticas RLS existentes deberían seguir funcionando
-- Pero podemos agregar políticas más específicas si es necesario

-- Política para que los usuarios puedan ver mensajes del foro de contenidos a los que tienen acceso
-- (Esto se manejará en las APIs, pero podemos agregar una política básica)
-- CREATE POLICY "Usuarios pueden ver mensajes de foros de sus cursos"
--   ON mensajes_foro
--   FOR SELECT
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM contenido c
--       INNER JOIN subtemas s ON c.subtema_id = s.id
--       INNER JOIN temas t ON s.tema_id = t.id
--       INNER JOIN periodos p ON t.periodo_id = p.id
--       INNER JOIN materias m ON p.materia_id = m.id
--       INNER JOIN estudiantes_cursos ec ON m.curso_id = ec.curso_id
--       INNER JOIN estudiantes e ON ec.estudiante_id = e.id
--       WHERE e.user_id = auth.uid()
--         AND c.id = mensajes_foro.contenido_id
--     )
--   );

-- ============================================
-- 4. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN mensajes_foro.contenido_id IS 'ID del contenido al que pertenece este mensaje del foro';
COMMENT ON COLUMN mensajes_foro.es_pregunta IS 'Indica si este mensaje es una pregunta inicial de un estudiante';
COMMENT ON COLUMN mensajes_foro.respondido IS 'Indica si el profesor ya respondió a esta pregunta';
COMMENT ON COLUMN notificaciones.mensaje_foro_id IS 'ID del mensaje del foro relacionado con esta notificación';
COMMENT ON COLUMN notificaciones.contenido_id IS 'ID del contenido relacionado con esta notificación';

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. La migración de tema_id a contenido_id requiere que existan contenidos
--    relacionados con los temas. Si no existen, los mensajes antiguos quedarán
--    con contenido_id NULL.
-- 2. Después de ejecutar este script, verifica que la migración fue exitosa
--    antes de eliminar la columna tema_id.
-- 3. Actualiza las APIs y componentes para usar contenido_id en lugar de tema_id.
-- ============================================


