-- Script para actualizar las políticas RLS de editable_content
-- Ejecuta este script si la tabla ya existe pero las políticas no funcionan correctamente

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Public can read editable content" ON editable_content;
DROP POLICY IF EXISTS "Super admins can manage editable content" ON editable_content;
DROP POLICY IF EXISTS "Service role can manage editable content" ON editable_content;

-- Crear política para lectura pública
CREATE POLICY "Public can read editable content"
  ON editable_content
  FOR SELECT
  USING (true);

-- Crear política para permitir todas las operaciones desde el servicio admin
-- Esto permite que las rutas API del servidor (usando SERVICE_ROLE_KEY) puedan guardar contenido
CREATE POLICY "Service role can manage editable content"
  ON editable_content
  FOR ALL
  USING (true)
  WITH CHECK (true);



