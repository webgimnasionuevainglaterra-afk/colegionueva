import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurado' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const intentoId = searchParams.get('intento_id');
    const tipo = searchParams.get('tipo'); // 'quiz' | 'evaluacion'

    if (!intentoId || !tipo) {
      return NextResponse.json({ error: 'intento_id y tipo son requeridos' }, { status: 400 });
    }

    // Verificar que el intento pertenece al estudiante autenticado
    if (tipo === 'quiz') {
      const { data: intento, error: intentoError } = await supabaseAdmin
        .from('intentos_quiz')
        .select('id, estudiante_id')
        .eq('id', intentoId)
        .single();

      if (intentoError || !intento || intento.estudiante_id !== user.id) {
        return NextResponse.json({ error: 'No tienes acceso a este intento' }, { status: 403 });
      }
    } else if (tipo === 'evaluacion') {
      const { data: intento, error: intentoError } = await supabaseAdmin
        .from('intentos_evaluacion')
        .select('id, estudiante_id')
        .eq('id', intentoId)
        .single();

      if (intentoError || !intento || intento.estudiante_id !== user.id) {
        return NextResponse.json({ error: 'No tienes acceso a este intento' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'tipo debe ser quiz o evaluacion' }, { status: 400 });
    }

    if (tipo === 'quiz') {
      const { data: respuestas, error } = await supabaseAdmin
        .from('respuestas_estudiante')
        .select(`
          id,
          pregunta_id,
          opcion_seleccionada_id,
          es_correcta,
          preguntas:pregunta_id (
            id,
            pregunta_texto,
            orden,
            opciones_respuesta (
              id,
              texto,
              es_correcta,
              explicacion
            )
          )
        `)
        .eq('intento_id', intentoId)
        .order('pregunta_id');

      if (error) {
        console.error('Error respuestas quiz:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const formateadas = (respuestas || []).map((r: any) => ({
        pregunta: r.preguntas?.pregunta_texto || 'N/A',
        orden: r.preguntas?.orden ?? 0,
        es_correcta: r.es_correcta === true,
        opcionSeleccionada: r.opcion_seleccionada_id,
        opciones: r.preguntas?.opciones_respuesta || [],
      }));

      return NextResponse.json({ success: true, data: formateadas }, { status: 200 });
    }

    if (tipo === 'evaluacion') {
      const { data: respuestas, error } = await supabaseAdmin
        .from('respuestas_estudiante_evaluacion')
        .select(`
          id,
          pregunta_id,
          opcion_seleccionada_id,
          es_correcta,
          preguntas_evaluacion:pregunta_id (
            id,
            pregunta_texto,
            orden,
            opciones_respuesta_evaluacion (
              id,
              texto,
              es_correcta,
              explicacion
            )
          )
        `)
        .eq('intento_id', intentoId)
        .order('pregunta_id');

      if (error) {
        console.error('Error respuestas evaluacion:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const formateadas = (respuestas || []).map((r: any) => ({
        pregunta: r.preguntas_evaluacion?.pregunta_texto || 'N/A',
        orden: r.preguntas_evaluacion?.orden ?? 0,
        es_correcta: r.es_correcta === true,
        opcionSeleccionada: r.opcion_seleccionada_id,
        opciones: r.preguntas_evaluacion?.opciones_respuesta_evaluacion || [],
      }));

      return NextResponse.json({ success: true, data: formateadas }, { status: 200 });
    }

    return NextResponse.json({ error: 'tipo debe ser quiz o evaluacion' }, { status: 400 });
  } catch (err: any) {
    console.error('Error get-intento-respuestas estudiante:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
