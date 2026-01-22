import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluacion_id, is_active } = body;

    if (!evaluacion_id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'evaluacion_id e is_active son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el usuario autenticado
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es un profesor y tiene permiso para esta evaluación
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profesorError && profesor) {
      // Verificar que la evaluación pertenece a un curso asignado al profesor
      const { data: evaluacionData, error: evaluacionError } = await supabaseAdmin
        .from('evaluaciones_periodo')
        .select(`
          id,
          materia_id,
          materias (
            id,
            curso_id
          )
        `)
        .eq('id', evaluacion_id)
        .single();

      if (evaluacionError || !evaluacionData) {
        return NextResponse.json(
          { error: 'Evaluación no encontrada' },
          { status: 404 }
        );
      }

      const cursoId = evaluacionData.materias?.curso_id;
      if (!cursoId) {
        return NextResponse.json(
          { error: 'No se pudo determinar el curso de la evaluación' },
          { status: 400 }
        );
      }

      // Verificar que el profesor tiene asignado este curso
      const { data: cursoAsignado, error: cursoError } = await supabaseAdmin
        .from('profesores_cursos')
        .select('id')
        .eq('profesor_id', user.id)
        .eq('curso_id', cursoId)
        .single();

      if (cursoError || !cursoAsignado) {
        return NextResponse.json(
          { error: 'No tienes permiso para modificar esta evaluación' },
          { status: 403 }
        );
      }
    }

    // Actualizar el estado
    const { error: updateError } = await supabaseAdmin
      .from('evaluaciones_periodo')
      .update({ is_active })
      .eq('id', evaluacion_id);

    if (updateError) {
      console.error('Error al actualizar evaluación:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al actualizar la evaluación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Evaluación ${is_active ? 'activada' : 'desactivada'} exitosamente`,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en toggle-active evaluación:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





