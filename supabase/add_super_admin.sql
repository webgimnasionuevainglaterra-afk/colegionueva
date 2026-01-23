-- Agregar el usuario webgimnasionuevainglaterra@gmail.com a la tabla administrators
-- Este script asume que el usuario ya existe en auth.users con el UID: dfdca86b-187f-49c2-8fe5-ee735a2a6d42

INSERT INTO administrators (
  id,
  email,
  password_hash,
  nombre,
  apellido,
  foto_url,
  role,
  created_by,
  is_active
)
VALUES (
  'dfdca86b-187f-49c2-8fe5-ee735a2a6d42',
  'webgimnasionuevainglaterra@gmail.com',
  '',
  'Juan Camilo',
  '',
  NULL,
  'super_admin',
  NULL,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;







