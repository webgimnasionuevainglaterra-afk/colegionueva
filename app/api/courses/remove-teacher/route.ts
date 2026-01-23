import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { curso_id, profesor_id } = body;

    if (!curso_id || !profesor_id) {
      return NextResponse.json(
        { error: 'curso_id y profesor_id son requeridos' },
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
      .from('profesores_cursos')
      .delete()
      .eq('profesor_id', profesor_id)
      .eq('curso_id', curso_id);

    if (error) {
      console.error('Error al quitar profesor del curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al quitar el profesor del curso' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Profesor removido del curso exitosamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en remove-teacher:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


