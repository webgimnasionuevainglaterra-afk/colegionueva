import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluacion_id = searchParams.get('evaluacion_id');
    const periodo_id = searchParams.get('periodo_id');
    const materia_id = searchParams.get('materia_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('evaluaciones_periodo')
      .select('*');

    if (evaluacion_id) {
      query = query.eq('id', evaluacion_id);
    } else if (periodo_id && materia_id) {
      query = query.eq('periodo_id', periodo_id).eq('materia_id', materia_id);
    } else {
      return NextResponse.json(
        { error: 'Se requiere evaluacion_id o (periodo_id y materia_id)' },
        { status: 400 }
      );
    }

    const { data: evaluaciones, error } = await query;

    if (error) {
      console.error('Error al obtener evaluaciones:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener las evaluaciones' },
        { status: 500 }
      );
    }

    // Si se solicita una evaluación específica, incluir preguntas y opciones
    if (evaluacion_id && evaluaciones && evaluaciones.length > 0) {
      const evaluacion = evaluaciones[0];
      
      // Obtener preguntas
      const { data: preguntas, error: preguntasError } = await supabaseAdmin
        .from('preguntas_evaluacion')
        .select('*')
        .eq('evaluacion_id', evaluacion.id)
        .order('orden', { ascending: true });

      if (preguntasError) {
        console.error('Error al obtener preguntas:', preguntasError);
        return NextResponse.json(
          { error: preguntasError.message || 'Error al obtener las preguntas' },
          { status: 500 }
        );
      }

      // Obtener opciones para cada pregunta
      const preguntasConOpciones = await Promise.all(
        (preguntas || []).map(async (pregunta) => {
          const { data: opciones, error: opcionesError } = await supabaseAdmin
            .from('opciones_respuesta_evaluacion')
            .select('*')
            .eq('pregunta_id', pregunta.id)
            .order('orden', { ascending: true });

          if (opcionesError) {
            console.error('Error al obtener opciones:', opcionesError);
            return { ...pregunta, opciones: [] };
          }

          return { ...pregunta, opciones: opciones || [] };
        })
      );

      return NextResponse.json(
        { data: { ...evaluacion, preguntas: preguntasConOpciones } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { data: evaluaciones || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-evaluacion:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

