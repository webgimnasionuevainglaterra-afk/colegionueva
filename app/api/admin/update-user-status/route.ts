import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
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

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, isOnline } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Actualizar el estado online/offline en la tabla administrators
    const { error: updateError } = await supabaseAdmin
      .from('administrators')
      .update({ 
        is_online: isOnline,
        last_seen: isOnline ? new Date().toISOString() : null
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar estado:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al actualizar el estado' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Estado actualizado exitosamente'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-user-status:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





