import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Pregunta {
  id?: string;
  pregunta_texto: string;
  tiempo_segundos?: number;
  opciones: Array<{
    id?: string;
    texto: string;
    es_correcta: boolean;
    explicacion?: string;
  }>;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      evaluacion_id,
      nombre, 
      descripcion, 
      fecha_inicio,
      fecha_fin,
      is_active, // Si no se especifica, se calculará automáticamente
      preguntas 
    } = body;

    if (!evaluacion_id || !nombre || !preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
      return NextResponse.json(
        { error: 'evaluacion_id, nombre y preguntas son requeridos' },
        { status: 400 }
      );
    }

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'fecha_inicio y fecha_fin son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Validar que cada pregunta tenga al menos 2 opciones y una correcta
    for (const pregunta of preguntas) {
      if (!pregunta.pregunta_texto || !pregunta.opciones || pregunta.opciones.length < 2) {
        return NextResponse.json(
          { error: 'Cada pregunta debe tener al menos 2 opciones' },
          { status: 400 }
        );
      }
      const tieneCorrecta = pregunta.opciones.some((op: any) => op.es_correcta === true);
      if (!tieneCorrecta) {
        return NextResponse.json(
          { error: 'Cada pregunta debe tener al menos una opción correcta' },
          { status: 400 }
        );
      }
    }

    // Calcular is_active automáticamente si no se especifica manualmente
    // Se activa si la fecha actual está entre fecha_inicio y fecha_fin
    let isActiveValue: boolean;
    if (is_active !== undefined) {
      // Si el profesor especificó manualmente, usar ese valor
      isActiveValue = is_active;
    } else {
      // Calcular automáticamente basado en las fechas
      const ahora = new Date();
      const inicio = new Date(fecha_inicio);
      const fin = new Date(fecha_fin);
      isActiveValue = ahora >= inicio && ahora <= fin;
    }

    // Actualizar la evaluación
    const { error: evaluacionError } = await supabaseAdmin
      .from('evaluaciones_periodo')
      .update({
        nombre,
        descripcion: descripcion || null,
        fecha_inicio,
        fecha_fin,
        is_active: isActiveValue,
      })
      .eq('id', evaluacion_id);

    if (evaluacionError) {
      console.error('Error al actualizar evaluación:', evaluacionError);
      return NextResponse.json(
        { error: evaluacionError.message || 'Error al actualizar la evaluación' },
        { status: 500 }
      );
    }

    // Obtener preguntas existentes
    const { data: preguntasExistentes } = await supabaseAdmin
      .from('preguntas_evaluacion')
      .select('id')
      .eq('evaluacion_id', evaluacion_id);

    const idsPreguntasExistentes = new Set((preguntasExistentes || []).map(p => p.id));
    const idsPreguntasNuevas = new Set(preguntas.filter((p: Pregunta) => p.id).map((p: Pregunta) => p.id));

    // Eliminar preguntas que ya no están
    const idsAEliminar = Array.from(idsPreguntasExistentes).filter(id => !idsPreguntasNuevas.has(id));
    if (idsAEliminar.length > 0) {
      await supabaseAdmin
        .from('preguntas_evaluacion')
        .delete()
        .in('id', idsAEliminar);
    }

    // Actualizar o crear preguntas y opciones
    for (let i = 0; i < preguntas.length; i++) {
      const preguntaData = preguntas[i];
      
      if (preguntaData.id && idsPreguntasExistentes.has(preguntaData.id)) {
        // Actualizar pregunta existente
        const { error: preguntaError } = await supabaseAdmin
          .from('preguntas_evaluacion')
          .update({
            pregunta_texto: preguntaData.pregunta_texto,
            tiempo_segundos: preguntaData.tiempo_segundos || 30,
            archivo_url: preguntaData.archivo_url || null,
            orden: i + 1,
          })
          .eq('id', preguntaData.id);

        if (preguntaError) {
          console.error('Error al actualizar pregunta:', preguntaError);
          return NextResponse.json(
            { error: preguntaError.message || 'Error al actualizar las preguntas' },
            { status: 500 }
          );
        }

        // Obtener opciones existentes de esta pregunta
        const { data: opcionesExistentes } = await supabaseAdmin
          .from('opciones_respuesta_evaluacion')
          .select('id')
          .eq('pregunta_id', preguntaData.id);

        const idsOpcionesExistentes = new Set((opcionesExistentes || []).map(o => o.id));
        const idsOpcionesNuevas = new Set(preguntaData.opciones.filter((o: any) => o.id).map((o: any) => o.id));

        // Eliminar opciones que ya no están
        const idsOpcionesAEliminar = Array.from(idsOpcionesExistentes).filter(id => !idsOpcionesNuevas.has(id));
        if (idsOpcionesAEliminar.length > 0) {
          await supabaseAdmin
            .from('opciones_respuesta_evaluacion')
            .delete()
            .in('id', idsOpcionesAEliminar);
        }

        // Actualizar o crear opciones
        for (let j = 0; j < preguntaData.opciones.length; j++) {
          const opcion = preguntaData.opciones[j];
          
          if (opcion.id && idsOpcionesExistentes.has(opcion.id)) {
            // Actualizar opción existente
            const { error: opcionError } = await supabaseAdmin
              .from('opciones_respuesta_evaluacion')
              .update({
                texto: opcion.texto,
                es_correcta: opcion.es_correcta,
                explicacion: opcion.explicacion || null,
                orden: j + 1,
              })
              .eq('id', opcion.id);

            if (opcionError) {
              console.error('Error al actualizar opción:', opcionError);
              return NextResponse.json(
                { error: opcionError.message || 'Error al actualizar las opciones' },
                { status: 500 }
              );
            }
          } else {
            // Crear nueva opción
            const { error: opcionError } = await supabaseAdmin
              .from('opciones_respuesta_evaluacion')
              .insert({
                pregunta_id: preguntaData.id,
                texto: opcion.texto,
                es_correcta: opcion.es_correcta,
                explicacion: opcion.explicacion || null,
                orden: j + 1,
              });

            if (opcionError) {
              console.error('Error al crear opción:', opcionError);
              return NextResponse.json(
                { error: opcionError.message || 'Error al crear las opciones' },
                { status: 500 }
              );
            }
          }
        }
      } else {
        // Crear nueva pregunta
        const { data: pregunta, error: preguntaError } = await supabaseAdmin
          .from('preguntas_evaluacion')
          .insert({
            evaluacion_id: evaluacion_id,
            pregunta_texto: preguntaData.pregunta_texto,
            tiempo_segundos: preguntaData.tiempo_segundos || 30,
            archivo_url: preguntaData.archivo_url || null,
            orden: i + 1,
          })
          .select()
          .single();

        if (preguntaError) {
          console.error('Error al crear pregunta:', preguntaError);
          return NextResponse.json(
            { error: preguntaError.message || 'Error al crear las preguntas' },
            { status: 500 }
          );
        }

        // Crear opciones para la nueva pregunta
        for (let j = 0; j < preguntaData.opciones.length; j++) {
          const opcion = preguntaData.opciones[j];
          const { error: opcionError } = await supabaseAdmin
            .from('opciones_respuesta_evaluacion')
            .insert({
              pregunta_id: pregunta.id,
              texto: opcion.texto,
              es_correcta: opcion.es_correcta,
              explicacion: opcion.explicacion || null,
              orden: j + 1,
            });

          if (opcionError) {
            console.error('Error al crear opción:', opcionError);
            return NextResponse.json(
              { error: opcionError.message || 'Error al crear las opciones' },
              { status: 500 }
            );
          }
        }
      }
    }

    return NextResponse.json(
      { message: 'Evaluación actualizada exitosamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-evaluacion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

