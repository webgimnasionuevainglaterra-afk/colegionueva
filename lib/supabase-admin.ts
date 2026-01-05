// Este archivo contiene funciones para usar con el Admin API de Supabase
// NOTA: Estas funciones requieren el SERVICE_ROLE_KEY (nunca lo expongas en el cliente)

import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANTE: Esta clave solo debe usarse en el servidor (API routes)
// NUNCA la expongas en el cliente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdhvrvawsguwnbnfokaa.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente con permisos de administrador (solo para uso en servidor)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Confirmar email de un usuario (solo funciona con SERVICE_ROLE_KEY)
 * Esta función debe ejecutarse desde una API route del servidor
 */
export async function confirmUserEmail(userId: string) {
  if (!supabaseAdmin) {
    throw new Error('SERVICE_ROLE_KEY no configurada. Esta función solo funciona en el servidor.');
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  return data;
}

