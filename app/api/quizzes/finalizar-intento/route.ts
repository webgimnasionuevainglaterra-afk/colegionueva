import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intento_id } = body;

    if (!intento_id) {
      return NextResponse.json(
        { error: 'intento_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el intento
    const { data: intento, error: intentoError } = await supabaseAdmin
      .from('intentos_quiz')
      .select('*, quizzes(*)')
      .eq('id', intento_id)
      .single();

    if (intentoError || !intento) {
      return NextResponse.json(
        { error: 'Intento no encontrado' },
        { status: 404 }
      );
    }

    if (intento.completado) {
      return NextResponse.json(
        { error: 'Este intento ya fue completado' },
        { status: 400 }
      );
    }

    // Obtener todas las respuestas del intento
    const { data: respuestas, error: respuestasError } = await supabaseAdmin
      .from('respuestas_estudiante')
      .select('*')
      .eq('intento_id', intento_id);

    if (respuestasError) {
      console.error('Error al obtener respuestas:', respuestasError);
      return NextResponse.json(
        { error: respuestasError.message || 'Error al calcular la calificación' },
        { status: 500 }
      );
    }

    // Obtener el total de preguntas del quiz
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from('preguntas')
      .select('id')
      .eq('quiz_id', intento.quiz_id);

    if (preguntasError) {
      console.error('Error al obtener preguntas:', preguntasError);
      return NextResponse.json(
        { error: preguntasError.message || 'Error al calcular la calificación' },
        { status: 500 }
      );
    }

    const totalPreguntas = preguntas?.length || 0;
    const respuestasCorrectas = respuestas?.filter(r => r.es_correcta === true).length || 0;

    // Calcular calificación: (respuestas correctas / total preguntas) * 5
    const calificacion = totalPreguntas > 0 
      ? (respuestasCorrectas / totalPreguntas) * 5 
      : 0;

    // Actualizar el intento
    const { data: intentoActualizado, error: updateError } = await supabaseAdmin
      .from('intentos_quiz')
      .update({
        fecha_fin: new Date().toISOString(),
        calificacion: parseFloat(calificacion.toFixed(2)),
        completado: true,
      })
      .eq('id', intento_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al finalizar intento:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al finalizar el intento' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        data: intentoActualizado,
        resumen: {
          total_preguntas: totalPreguntas,
          respuestas_correctas: respuestasCorrectas,
          calificacion: parseFloat(calificacion.toFixed(2)),
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en finalizar-intento:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

