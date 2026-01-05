import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdhvrvawsguwnbnfokaa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkaHZydmF3c2d1d25ibmZva2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjM2NDgsImV4cCI6MjA4MzE5OTY0OH0.bIfT7nvNc6ewUms4nDsblYH6vtUGm-GCcjY3RD9JCm0';

// Validar que las variables estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing. Using default values.');
}

// Crear y exportar el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Tipos útiles para TypeScript (puedes expandirlos según tus tablas)
export type Database = {
  // Aquí puedes agregar los tipos de tu base de datos cuando los definas
};

