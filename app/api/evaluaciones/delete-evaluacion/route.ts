import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Eliminar la evaluación (las preguntas y opciones se eliminan en cascada)
    const { error } = await supabaseAdmin
      .from('evaluaciones_periodo')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar evaluación:', error);
      return NextResponse.json(
        { error: error.message || 'Error al eliminar la evaluación' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Evaluación eliminada exitosamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en delete-evaluacion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









