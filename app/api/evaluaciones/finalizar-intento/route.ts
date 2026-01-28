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
      .from('intentos_evaluacion')
      .select('*, evaluaciones_periodo(*)')
      .eq('id', intento_id)
      .single();

    if (intentoError || !intento) {
      return NextResponse.json(
        { error: 'Intento no encontrado' },
        { status: 404 }
      );
    }

    if (intento.completado) {
      // Si ya está completado, obtener las respuestas detalladas y devolver la calificación existente
      const { data: respuestas } = await supabaseAdmin
        .from('respuestas_estudiante_evaluacion')
        .select(`
          *,
          opciones_respuesta_evaluacion:opcion_seleccionada_id (
            id,
            texto,
            explicacion,
            es_correcta
          )
        `)
        .eq('intento_id', intento_id);

      const { data: preguntas } = await supabaseAdmin
        .from('preguntas_evaluacion')
        .select(`
          id,
          pregunta_texto,
          orden,
          opciones_respuesta_evaluacion (
            id,
            texto,
            explicacion,
            es_correcta
          )
        `)
        .eq('evaluacion_id', intento.evaluacion_id)
        .order('orden', { ascending: true });

      const totalPreguntas = preguntas?.length || 0;
      const respuestasCorrectas = respuestas?.filter(r => r.es_correcta === true).length || 0;

      // Construir el resumen detallado de respuestas
      const resumenRespuestas = await Promise.all(
        (preguntas || []).map(async (pregunta) => {
          const respuestaEstudiante = respuestas?.find((r) => r.pregunta_id === pregunta.id);
          
          // Obtener la opción seleccionada por el estudiante con su explicación
          let opcionSeleccionada = null;
          if (respuestaEstudiante?.opcion_seleccionada_id) {
            const { data: opcionSel } = await supabaseAdmin
              .from('opciones_respuesta_evaluacion')
              .select('id, texto, explicacion, es_correcta')
              .eq('id', respuestaEstudiante.opcion_seleccionada_id)
              .single();
            opcionSeleccionada = opcionSel;
          }
          
          // Obtener la opción correcta
          const opcionCorrecta = Array.isArray(pregunta.opciones_respuesta_evaluacion) 
            ? pregunta.opciones_respuesta_evaluacion.find((op: any) => op.es_correcta === true)
            : null;
          
          // Si no hay opción correcta en el array, buscarla directamente
          let opcionCorrectaFinal = opcionCorrecta;
          if (!opcionCorrectaFinal) {
            const { data: opcionCorr } = await supabaseAdmin
              .from('opciones_respuesta_evaluacion')
              .select('id, texto, explicacion, es_correcta')
              .eq('pregunta_id', pregunta.id)
              .eq('es_correcta', true)
              .single();
            opcionCorrectaFinal = opcionCorr;
          }
          
          const esCorrecta = respuestaEstudiante?.es_correcta === true;

          return {
            pregunta_id: pregunta.id,
            pregunta_texto: pregunta.pregunta_texto,
            orden: pregunta.orden,
            respuesta_estudiante: opcionSeleccionada ? {
              id: opcionSeleccionada.id,
              texto: opcionSeleccionada.texto,
              explicacion: opcionSeleccionada.explicacion || null,
            } : null,
            respuesta_correcta: opcionCorrectaFinal ? {
              id: opcionCorrectaFinal.id,
              texto: opcionCorrectaFinal.texto,
              explicacion: opcionCorrectaFinal.explicacion || null,
            } : null,
            es_correcta: esCorrecta,
            no_respondida: !respuestaEstudiante,
          };
        })
      );

      return NextResponse.json(
        { 
          data: intento,
          resumen: {
            total_preguntas: totalPreguntas,
            respuestas_correctas: respuestasCorrectas,
            calificacion: intento.calificacion || 0,
          },
          respuestas_detalladas: resumenRespuestas,
          ya_completado: true
        },
        { status: 200 }
      );
    }

    // Obtener todas las respuestas del intento con detalles completos
    const { data: respuestas, error: respuestasError } = await supabaseAdmin
      .from('respuestas_estudiante_evaluacion')
      .select(`
        *,
        opciones_respuesta_evaluacion:opcion_seleccionada_id (
          id,
          texto,
          explicacion,
          es_correcta
        )
      `)
      .eq('intento_id', intento_id);

    if (respuestasError) {
      console.error('Error al obtener respuestas:', respuestasError);
      return NextResponse.json(
        { error: respuestasError.message || 'Error al calcular la calificación' },
        { status: 500 }
      );
    }

    // Obtener todas las preguntas de la evaluación con sus opciones correctas
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from('preguntas_evaluacion')
      .select(`
        id,
        pregunta_texto,
        orden,
        opciones_respuesta_evaluacion (
          id,
          texto,
          explicacion,
          es_correcta
        )
      `)
      .eq('evaluacion_id', intento.evaluacion_id)
      .order('orden', { ascending: true });

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

    // Construir el resumen detallado de respuestas
    const resumenRespuestas = await Promise.all(
      (preguntas || []).map(async (pregunta) => {
        const respuestaEstudiante = respuestas?.find((r) => r.pregunta_id === pregunta.id);
        
        // Obtener la opción seleccionada por el estudiante
        let opcionSeleccionada = null;
        if (respuestaEstudiante?.opcion_seleccionada_id) {
          const { data: opcionSel } = await supabaseAdmin
            .from('opciones_respuesta_evaluacion')
            .select('id, texto, explicacion, es_correcta')
            .eq('id', respuestaEstudiante.opcion_seleccionada_id)
            .single();
          opcionSeleccionada = opcionSel;
        }
        
        // Obtener la opción correcta
        const opcionCorrecta = Array.isArray(pregunta.opciones_respuesta_evaluacion) 
          ? pregunta.opciones_respuesta_evaluacion.find((op: any) => op.es_correcta === true)
          : null;
        
        // Si no hay opción correcta en el array, buscarla directamente
        let opcionCorrectaFinal = opcionCorrecta;
        if (!opcionCorrectaFinal) {
          const { data: opcionCorr } = await supabaseAdmin
            .from('opciones_respuesta_evaluacion')
            .select('id, texto, explicacion, es_correcta')
            .eq('pregunta_id', pregunta.id)
            .eq('es_correcta', true)
            .single();
          opcionCorrectaFinal = opcionCorr;
        }
        
        const esCorrecta = respuestaEstudiante?.es_correcta === true;

        return {
          pregunta_id: pregunta.id,
          pregunta_texto: pregunta.pregunta_texto,
          orden: pregunta.orden,
          respuesta_estudiante: opcionSeleccionada ? {
            id: opcionSeleccionada.id,
            texto: opcionSeleccionada.texto,
            explicacion: opcionSeleccionada.explicacion || null,
          } : null,
          respuesta_correcta: opcionCorrectaFinal ? {
            id: opcionCorrectaFinal.id,
            texto: opcionCorrectaFinal.texto,
            explicacion: opcionCorrectaFinal.explicacion || null,
          } : null,
          es_correcta: esCorrecta,
          no_respondida: !respuestaEstudiante,
        };
      })
    );

    // Actualizar el intento
    const { data: intentoActualizado, error: updateError } = await supabaseAdmin
      .from('intentos_evaluacion')
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

    // Al finalizar el intento, desactivar cualquier override individual
    // (evaluaciones_estudiantes) para que el estudiante no pueda volver a presentar
    // a menos que el profesor lo active de nuevo.
    try {
      await supabaseAdmin
        .from('evaluaciones_estudiantes')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('evaluacion_id', intento.evaluacion_id)
        .eq('estudiante_id', intento.estudiante_id);
    } catch (overrideError) {
      console.warn('No se pudo desactivar override individual de evaluación al finalizar intento:', overrideError);
    }

    return NextResponse.json(
      { 
        data: intentoActualizado,
        resumen: {
          total_preguntas: totalPreguntas,
          respuestas_correctas: respuestasCorrectas,
          calificacion: parseFloat(calificacion.toFixed(2)),
        },
        respuestas_detalladas: resumenRespuestas
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


