import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluacion_id, estudiante_id } = body;

    if (!evaluacion_id || !estudiante_id) {
      return NextResponse.json(
        { error: 'evaluacion_id y estudiante_id son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Verificar que la evaluación existe y está disponible
    const { data: evaluacion, error: evaluacionError } = await supabaseAdmin
      .from('evaluaciones_periodo')
      .select('*')
      .eq('id', evaluacion_id)
      .single();

    if (evaluacionError || !evaluacion) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    const ahora = new Date();
    const fechaInicio = new Date(evaluacion.fecha_inicio);
    const fechaFin = new Date(evaluacion.fecha_fin);

    if (ahora < fechaInicio) {
      return NextResponse.json(
        { error: 'La evaluación aún no está disponible' },
        { status: 400 }
      );
    }

    if (ahora > fechaFin) {
      return NextResponse.json(
        { error: 'La evaluación ya no está disponible' },
        { status: 400 }
      );
    }

    // Verificar si hay un override individual de activación para esta evaluación
    let tieneOverrideActivo = false;
    try {
      const { data: registroIndividual } = await supabaseAdmin
        .from('evaluaciones_estudiantes')
        .select('is_active')
        .eq('evaluacion_id', evaluacion_id)
        .eq('estudiante_id', estudiante_id)
        .maybeSingle();

      if (registroIndividual && registroIndividual.is_active === true) {
        tieneOverrideActivo = true;
      }
    } catch (e) {
      console.warn('No se pudo verificar override individual de evaluación:', e);
    }

    // Verificar si ya existe un intento
    const { data: intentoExistente } = await supabaseAdmin
      .from('intentos_evaluacion')
      .select('*')
      .eq('evaluacion_id', evaluacion_id)
      .eq('estudiante_id', estudiante_id)
      .single();

    if (intentoExistente) {
      if (intentoExistente.completado) {
        // Si ya estaba completado pero NO hay override individual activo,
        // mantener el comportamiento anterior: bloquear nuevo intento.
        if (!tieneOverrideActivo) {
          return NextResponse.json(
            { 
              error: 'Ya has completado esta evaluación',
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
          .from('respuestas_estudiante_evaluacion')
          .delete()
          .eq('intento_id', intentoExistente.id);

        if (deleteError) {
          console.error('Error al borrar respuestas anteriores de la evaluación:', deleteError);
          return NextResponse.json(
            { error: deleteError.message || 'Error al preparar el nuevo intento' },
            { status: 500 }
          );
        }

        const { data: intentoReseteado, error: resetError } = await supabaseAdmin
          .from('intentos_evaluacion')
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
          console.error('Error al resetear intento de evaluación:', resetError);
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
        // Si el intento existente no está completado, reutilizarlo
        return NextResponse.json(
          { data: intentoExistente },
          { status: 200 }
        );
      }
    }

    // Crear nuevo intento (primer intento)
    const { data: intento, error: intentoError } = await supabaseAdmin
      .from('intentos_evaluacion')
      .insert({
        evaluacion_id,
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


