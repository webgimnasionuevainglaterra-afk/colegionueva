import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { quiz_id, estudiante_id, is_active } = body;

    if (!quiz_id || !estudiante_id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'quiz_id, estudiante_id e is_active son requeridos' },
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

      // Convertir user_id (auth.users.id) a estudiante.id
      // porque estudiantes_cursos.estudiante_id referencia estudiantes.id, no auth.users.id
      const { data: estudianteData, error: estudianteDataError } = await supabaseAdmin
        .from('estudiantes')
        .select('id')
        .eq('user_id', estudiante_id)
        .single();

      if (estudianteDataError || !estudianteData) {
        return NextResponse.json(
          { error: 'Estudiante no encontrado' },
          { status: 404 }
        );
      }

      // Verificar que el estudiante está en el curso
      const { data: estudianteEnCurso, error: estudianteError } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('id')
        .eq('estudiante_id', estudianteData.id)
        .eq('curso_id', cursoId)
        .single();

      if (estudianteError || !estudianteEnCurso) {
        return NextResponse.json(
          { error: 'El estudiante no está inscrito en este curso' },
          { status: 403 }
        );
      }
    }

    // Buscar si ya existe un registro para este quiz-estudiante
    // Usar maybeSingle() en lugar de single() para manejar el caso cuando no hay registros
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from('quizzes_estudiantes')
      .select('id')
      .eq('quiz_id', quiz_id)
      .eq('estudiante_id', estudiante_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error al verificar registro existente:', checkError);
      
      // Verificar si el error es porque la tabla no existe
      const errorMessage = checkError.message || '';
      if (errorMessage.includes("Could not find the table") || errorMessage.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: 'La tabla quizzes_estudiantes no existe. Por favor ejecuta el script SQL: /supabase/create_student_activation_tables.sql en Supabase SQL Editor.',
            table_missing: true
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error al verificar el registro: ' + errorMessage },
        { status: 500 }
      );
    }

    let result;
    if (existingRecord) {
      // Actualizar registro existente
      const { error: updateError } = await supabaseAdmin
        .from('quizzes_estudiantes')
        .update({ 
          is_active,
          activado_por: user.id,
          fecha_activacion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Error al actualizar quiz_estudiante:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Error al actualizar el estado' },
          { status: 500 }
        );
      }
      result = { updated: true };
    } else {
      // Crear nuevo registro
      const { error: insertError } = await supabaseAdmin
        .from('quizzes_estudiantes')
        .insert({
          quiz_id,
          estudiante_id,
          is_active,
          activado_por: user.id,
          fecha_activacion: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error al crear quiz_estudiante:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Error al crear el registro' },
          { status: 500 }
        );
      }
      result = { created: true };
    }

    return NextResponse.json({
      success: true,
      message: `Quiz ${is_active ? 'activado' : 'desactivado'} para el estudiante exitosamente`,
      data: result,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en toggle-active-student quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

