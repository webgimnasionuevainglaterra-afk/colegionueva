import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quiz_id, estudiante_id } = body;

    if (!quiz_id || !estudiante_id) {
      return NextResponse.json(
        { error: 'quiz_id y estudiante_id son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Verificar que el quiz existe y está disponible
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quiz_id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: 'Quiz no encontrado' },
        { status: 404 }
      );
    }

    const ahora = new Date();
    const fechaInicio = new Date(quiz.fecha_inicio);
    const fechaFin = new Date(quiz.fecha_fin);

    if (ahora < fechaInicio) {
      return NextResponse.json(
        { error: 'El quiz aún no está disponible' },
        { status: 400 }
      );
    }

    if (ahora > fechaFin) {
      return NextResponse.json(
        { error: 'El quiz ya no está disponible' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un intento
    const { data: intentoExistente } = await supabaseAdmin
      .from('intentos_quiz')
      .select('*')
      .eq('quiz_id', quiz_id)
      .eq('estudiante_id', estudiante_id)
      .single();

    if (intentoExistente) {
      if (intentoExistente.completado) {
        return NextResponse.json(
          { error: 'Ya has completado este quiz' },
          { status: 400 }
        );
      }
      // Retornar el intento existente
      return NextResponse.json(
        { data: intentoExistente },
        { status: 200 }
      );
    }

    // Crear nuevo intento
    const { data: intento, error: intentoError } = await supabaseAdmin
      .from('intentos_quiz')
      .insert({
        quiz_id,
        estudiante_id,
        fecha_inicio: ahora.toISOString(),
        completado: false,
      })
      .select()
      .single();

    if (intentoError) {
      console.error('Error al crear intento:', intentoError);
      return NextResponse.json(
        { error: intentoError.message || 'Error al iniciar el intento' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: intento },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en iniciar-intento:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

