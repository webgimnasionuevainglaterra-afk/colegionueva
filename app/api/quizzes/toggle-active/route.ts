import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { quiz_id, is_active } = body;

    if (!quiz_id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'quiz_id e is_active son requeridos' },
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

    // Verificar que el usuario es un profesor y tiene permiso para este quiz
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profesorError && profesor) {
      // Verificar que el quiz pertenece a un curso asignado al profesor
      const { data: quizData, error: quizError } = await supabaseAdmin
        .from('quizzes')
        .select(`
          id,
          subtema_id,
          subtemas (
            id,
            tema_id,
            temas (
              id,
              periodo_id,
              periodos (
                id,
                materia_id,
                materias (
                  id,
                  curso_id
                )
              )
            )
          )
        `)
        .eq('id', quiz_id)
        .single();

      if (quizError || !quizData) {
        return NextResponse.json(
          { error: 'Quiz no encontrado' },
          { status: 404 }
        );
      }

      const cursoId = quizData.subtemas?.temas?.periodos?.materias?.curso_id;
      if (!cursoId) {
        return NextResponse.json(
          { error: 'No se pudo determinar el curso del quiz' },
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
          { error: 'No tienes permiso para modificar este quiz' },
          { status: 403 }
        );
      }
    }

    // Actualizar el estado
    const { error: updateError } = await supabaseAdmin
      .from('quizzes')
      .update({ is_active })
      .eq('id', quiz_id);

    if (updateError) {
      console.error('Error al actualizar quiz:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al actualizar el quiz' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Quiz ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en toggle-active quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}




