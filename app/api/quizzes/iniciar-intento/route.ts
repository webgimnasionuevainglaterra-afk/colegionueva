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

    // Verificar si hay un override individual de activación para este estudiante
    // Esto permite que, si el profesor "reactiva" el quiz para un estudiante,
    // pueda presentar nuevamente aunque ya tenga un intento completado.
    let tieneOverrideActivo = false;
    try {
      const { data: registroIndividual } = await supabaseAdmin
        .from('quizzes_estudiantes')
        .select('is_active')
        .eq('quiz_id', quiz_id)
        .eq('estudiante_id', estudiante_id)
        .maybeSingle();

      if (registroIndividual && registroIndividual.is_active === true) {
        tieneOverrideActivo = true;
      }
    } catch (e) {
      // Si falla esta consulta, no bloqueamos el flujo principal; simplemente
      // asumimos que no hay override y seguimos con la lógica normal.
      console.warn('No se pudo verificar override individual de quiz:', e);
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
        // Si ya estaba completado pero NO hay override individual activo,
        // se mantiene el comportamiento anterior: no permitir nuevo intento.
        if (!tieneOverrideActivo) {
          return NextResponse.json(
            { 
              error: 'Ya has completado este quiz',
              intento_id: intentoExistente.id,
              ya_completado: true
            },
            { status: 400 }
          );
        }

        // Si hay override activo, reutilizar el mismo intento:
        // - borrar respuestas anteriores
        // - resetear calificación y fechas
        const { error: deleteError } = await supabaseAdmin
          .from('respuestas_estudiante')
          .delete()
          .eq('intento_id', intentoExistente.id);

        if (deleteError) {
          console.error('Error al borrar respuestas anteriores del intento:', deleteError);
          return NextResponse.json(
            { error: deleteError.message || 'Error al preparar el nuevo intento' },
            { status: 500 }
          );
        }

        const { data: intentoReseteado, error: resetError } = await supabaseAdmin
          .from('intentos_quiz')
          .update({
            fecha_inicio: ahora.toISOString(),
            fecha_fin: null,
            calificacion: null,
            completado: false,
          })
          .eq('id', intentoExistente.id)
          .select()
          .single();

        if (resetError || !intentoReseteado) {
          console.error('Error al resetear intento:', resetError);
          return NextResponse.json(
            { error: resetError?.message || 'Error al reiniciar el intento' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { data: intentoReseteado },
          { status: 200 }
        );
      } else {
        // Si el intento existente no está completado, se reutiliza tal cual
        return NextResponse.json(
          { data: intentoExistente },
          { status: 200 }
        );
      }
    }

    // Crear nuevo intento (primer intento)
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




