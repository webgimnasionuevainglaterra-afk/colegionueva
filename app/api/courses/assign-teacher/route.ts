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

    // Verificar si ya existe la asignación
    const { data: asignacionExistente } = await supabaseAdmin
      .from('profesores_cursos')
      .select('id')
      .eq('profesor_id', profesor_id)
      .eq('curso_id', curso_id)
      .single();

    if (asignacionExistente) {
      return NextResponse.json(
        { error: 'El profesor ya está asignado a este curso' },
        { status: 400 }
      );
    }

    // Crear asignación
    const { data: asignacion, error } = await supabaseAdmin
      .from('profesores_cursos')
      .insert({
        profesor_id,
        curso_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al asignar profesor al curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al asignar el profesor al curso' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: asignacion, message: 'Profesor asignado al curso exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en assign-teacher:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



