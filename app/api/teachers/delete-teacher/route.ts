import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del profesor es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el profesor existe
    const { data: profesor, error: fetchError } = await supabaseAdmin
      .from('profesores')
      .select('id, nombre, apellido')
      .eq('id', id)
      .single();

    if (fetchError || !profesor) {
      return NextResponse.json(
        { error: 'Profesor no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar asignaciones de cursos primero (por las foreign keys)
    await supabaseAdmin
      .from('profesores_cursos')
      .delete()
      .eq('profesor_id', id);

    // Eliminar el profesor de la tabla profesores
    const { error: deleteError } = await supabaseAdmin
      .from('profesores')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error al eliminar profesor:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Error al eliminar el profesor' },
        { status: 500 }
      );
    }

    // Eliminar el usuario de auth.users (esto también eliminará el profesor por CASCADE si está configurado)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.warn('Error al eliminar usuario de Auth (puede que ya no exista):', authError);
      // No fallar si el usuario ya no existe en Auth
    }

    return NextResponse.json({
      success: true,
      message: 'Profesor eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error en delete-teacher:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
