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

    // Verificar si ya existe un intento
    const { data: intentoExistente } = await supabaseAdmin
      .from('intentos_evaluacion')
      .select('*')
      .eq('evaluacion_id', evaluacion_id)
      .eq('estudiante_id', estudiante_id)
      .single();

    if (intentoExistente) {
      if (intentoExistente.completado) {
        // Retornar el ID del intento completado para que el frontend pueda obtener los detalles
        return NextResponse.json(
          { 
            error: 'Ya has completado esta evaluación',
            intento_id: intentoExistente.id,
            ya_completado: true
          },
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


