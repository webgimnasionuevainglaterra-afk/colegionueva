import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del administrador es requerido' },
        { status: 400 }
      );
    }

    // 1. Eliminar de la tabla administrators
    const { error: deleteError } = await supabaseAdmin
      .from('administrators')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error al eliminar de tabla administrators:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Error al eliminar el administrador' },
        { status: 400 }
      );
    }

    // 2. Eliminar el usuario de Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.warn('Error al eliminar usuario de Auth:', authError);
      // Continuar aunque falle la eliminación en Auth
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Administrador eliminado exitosamente'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en delete-administrator:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






