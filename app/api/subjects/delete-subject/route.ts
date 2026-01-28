import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la materia es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Eliminar la materia
    const { error } = await supabaseAdmin
      .from('materias')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar materia:', error);
      return NextResponse.json(
        { error: error.message || 'Error al eliminar la materia' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Materia eliminada exitosamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en delete-subject:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









