# Configuración de Autenticación en Supabase

## Problema: "Email logins are disabled"

Si ves este error, significa que la autenticación por email está deshabilitada en tu proyecto de Supabase.

## Solución: Habilitar Autenticación por Email

### Pasos:

1. **Accede al Panel de Supabase:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto: `pdhvrvawsguwnbnfokaa`

2. **Habilita la Autenticación por Email:**
   - En el menú lateral, ve a **Authentication**
   - Luego a **Providers**
   - Busca **Email** en la lista de proveedores
   - Activa el toggle para habilitar Email
   - Guarda los cambios

3. **Configuración Adicional (Opcional):**
   - **Confirmación de Email:** Puedes desactivarla temporalmente para desarrollo
     - Ve a **Authentication** > **Settings**
     - Desactiva "Enable email confirmations" si quieres permitir login sin confirmar email

4. **Confirmar Email Manualmente (SOLUCIÓN RÁPIDA):**
   - Ve a **Authentication** > **Users**
   - Busca el usuario con email `webgimnasionuevainglaterra@gmail.com`
   - Haz clic en el usuario para abrir sus detalles
   - Busca el campo "Email Confirmed" o "Confirmado"
   - Si está en "false" o sin confirmar, haz clic en el ícono de editar o en "Confirm Email"
   - O simplemente cambia el estado a "Confirmed" / "Confirmado"
   - Guarda los cambios

5. **Alternativa: Desactivar Confirmación de Email (Para Desarrollo):**
   - Ve a **Authentication** > **Settings** > **Email Auth**
   - Desactiva "Enable email confirmations"
   - Esto permitirá que los usuarios inicien sesión sin confirmar el email
   - ⚠️ Solo para desarrollo, no recomendado para producción

## Después de Habilitar:

Una vez que hayas habilitado la autenticación por email, el login debería funcionar correctamente.

## Credenciales del Super Administrador:

- **Email:** webgimnasionuevainglaterra@gmail.com
- **Password:** Juancamilo311
- **UID:** dfdca86b-187f-49c2-8fe5-ee735a2a6d42

