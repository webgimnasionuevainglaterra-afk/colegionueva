import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener administradores usando el cliente admin (bypass RLS)
    const { data, error } = await supabaseAdmin
      .from('administrators')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener administradores:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los administradores' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        data: data || []
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-administrators:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









