import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estudiante_id = searchParams.get('estudiante_id');
    const curso_id = searchParams.get('curso_id');

    if (!estudiante_id || !curso_id) {
      return NextResponse.json(
        { error: 'estudiante_id y curso_id son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('estudiantes_cursos')
      .delete()
      .eq('estudiante_id', estudiante_id)
      .eq('curso_id', curso_id);

    if (error) {
      console.error('Error al quitar estudiante del curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al quitar el estudiante del curso' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Estudiante removido del curso exitosamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en quitar-curso:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}




