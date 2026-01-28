import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { estudiante_id, curso_id } = body;

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

    // Verificar si ya existe la asignación
    const { data: asignacionExistente } = await supabaseAdmin
      .from('estudiantes_cursos')
      .select('id')
      .eq('estudiante_id', estudiante_id)
      .eq('curso_id', curso_id)
      .single();

    if (asignacionExistente) {
      return NextResponse.json(
        { error: 'El estudiante ya está asignado a este curso' },
        { status: 400 }
      );
    }

    // Crear asignación
    const { data: asignacion, error } = await supabaseAdmin
      .from('estudiantes_cursos')
      .insert({
        estudiante_id,
        curso_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al asignar estudiante al curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al asignar el estudiante al curso' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: asignacion, message: 'Estudiante asignado al curso exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en asignar-curso:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









