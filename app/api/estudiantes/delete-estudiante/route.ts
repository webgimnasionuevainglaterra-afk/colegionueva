import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estudiante_id = searchParams.get('estudiante_id');

    if (!estudiante_id) {
      return NextResponse.json(
        { error: 'estudiante_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el estudiante para obtener el user_id
    const { data: estudiante, error: fetchError } = await supabaseAdmin
      .from('estudiantes')
      .select('user_id')
      .eq('id', estudiante_id)
      .single();

    if (fetchError || !estudiante) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar relaciones primero (estudiantes_cursos)
    await supabaseAdmin
      .from('estudiantes_cursos')
      .delete()
      .eq('estudiante_id', estudiante_id);

    // Eliminar el estudiante
    const { error: deleteError } = await supabaseAdmin
      .from('estudiantes')
      .delete()
      .eq('id', estudiante_id);

    if (deleteError) {
      console.error('Error al eliminar estudiante:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Error al eliminar el estudiante' },
        { status: 500 }
      );
    }

    // Eliminar el usuario de auth si existe
    if (estudiante.user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(estudiante.user_id);
      if (authError) {
        console.warn('Error al eliminar usuario de auth (no crítico):', authError);
        // No retornamos error aquí porque el estudiante ya fue eliminado
      }
    }

    return NextResponse.json(
      { success: true, message: 'Estudiante eliminado permanentemente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en delete-estudiante:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}







