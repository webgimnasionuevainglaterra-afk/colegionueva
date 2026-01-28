import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intento_id, pregunta_id, opcion_seleccionada_id, tiempo_tomado_segundos } = body;

    if (!intento_id || !pregunta_id || !opcion_seleccionada_id) {
      return NextResponse.json(
        { error: 'intento_id, pregunta_id y opcion_seleccionada_id son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Verificar que la opción seleccionada existe y obtener si es correcta
    const { data: opcion, error: opcionError } = await supabaseAdmin
      .from('opciones_respuesta')
      .select('es_correcta')
      .eq('id', opcion_seleccionada_id)
      .single();

    if (opcionError || !opcion) {
      return NextResponse.json(
        { error: 'Opción no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una respuesta para esta pregunta en este intento
    const { data: respuestaExistente } = await supabaseAdmin
      .from('respuestas_estudiante')
      .select('*')
      .eq('intento_id', intento_id)
      .eq('pregunta_id', pregunta_id)
      .single();

    let respuesta;
    if (respuestaExistente) {
      // Actualizar respuesta existente
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('respuestas_estudiante')
        .update({
          opcion_seleccionada_id,
          tiempo_tomado_segundos: tiempo_tomado_segundos || null,
          es_correcta: opcion.es_correcta,
        })
        .eq('id', respuestaExistente.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error al actualizar respuesta:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Error al guardar la respuesta' },
          { status: 500 }
        );
      }
      respuesta = updated;
    } else {
      // Crear nueva respuesta
      const { data: nueva, error: insertError } = await supabaseAdmin
        .from('respuestas_estudiante')
        .insert({
          intento_id,
          pregunta_id,
          opcion_seleccionada_id,
          tiempo_tomado_segundos: tiempo_tomado_segundos || null,
          es_correcta: opcion.es_correcta,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error al guardar respuesta:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Error al guardar la respuesta' },
          { status: 500 }
        );
      }
      respuesta = nueva;
    }

    // Obtener la explicación de la opción correcta
    const { data: opcionCorrecta } = await supabaseAdmin
      .from('opciones_respuesta')
      .select('texto, explicacion')
      .eq('pregunta_id', pregunta_id)
      .eq('es_correcta', true)
      .single();

    return NextResponse.json(
      { 
        data: respuesta,
        es_correcta: opcion.es_correcta,
        respuesta_correcta: opcionCorrecta,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en guardar-respuesta:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









