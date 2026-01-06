import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Pregunta {
  pregunta_texto: string;
  tiempo_segundos?: number;
  opciones: Array<{
    texto: string;
    es_correcta: boolean;
    explicacion?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      periodo_id, 
      materia_id,
      nombre, 
      descripcion, 
      fecha_inicio,
      fecha_fin,
      preguntas 
    } = body;

    if (!periodo_id || !materia_id || !nombre || !preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
      return NextResponse.json(
        { error: 'periodo_id, materia_id, nombre y preguntas son requeridos' },
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

    // Crear la evaluación
    const { data: evaluacion, error: evaluacionError } = await supabaseAdmin
      .from('evaluaciones_periodo')
      .insert({
        periodo_id,
        materia_id,
        nombre,
        descripcion: descripcion || null,
        tiempo_por_pregunta_segundos: 30, // Mantener por compatibilidad
        fecha_inicio,
        fecha_fin,
      })
      .select()
      .single();

    if (evaluacionError) {
      console.error('Error al crear evaluación:', evaluacionError);
      return NextResponse.json(
        { error: evaluacionError.message || 'Error al crear la evaluación' },
        { status: 500 }
      );
    }

    // Crear preguntas y opciones
    for (let i = 0; i < preguntas.length; i++) {
      const preguntaData = preguntas[i];
      
      const { data: pregunta, error: preguntaError } = await supabaseAdmin
        .from('preguntas_evaluacion')
        .insert({
          evaluacion_id: evaluacion.id,
          pregunta_texto: preguntaData.pregunta_texto,
          tiempo_segundos: preguntaData.tiempo_segundos || 30,
          orden: i + 1,
        })
        .select()
        .single();

      if (preguntaError) {
        console.error('Error al crear pregunta:', preguntaError);
        // Eliminar la evaluación si falla
        await supabaseAdmin.from('evaluaciones_periodo').delete().eq('id', evaluacion.id);
        return NextResponse.json(
          { error: preguntaError.message || 'Error al crear las preguntas' },
          { status: 500 }
        );
      }

      // Crear opciones de respuesta
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
          // Eliminar la evaluación y preguntas si falla
          await supabaseAdmin.from('preguntas_evaluacion').delete().eq('evaluacion_id', evaluacion.id);
          await supabaseAdmin.from('evaluaciones_periodo').delete().eq('id', evaluacion.id);
          return NextResponse.json(
            { error: opcionError.message || 'Error al crear las opciones' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      { data: evaluacion, message: 'Evaluación creada exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-evaluacion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

