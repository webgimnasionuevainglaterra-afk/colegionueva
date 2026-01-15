import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el ID del profesor desde el header de autorización
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar el token y obtener el usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es un profesor o super administrador
    const [profesorData, adminData] = await Promise.all([
      supabaseAdmin
        .from('profesores')
        .select('id')
        .eq('id', user.id)
        .single(),
      supabaseAdmin
        .from('administrators')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'super_admin')
        .single(),
    ]);

    const isProfesor = !profesorData.error && profesorData.data;
    const isSuperAdmin = !adminData.error && adminData.data;

    if (!isProfesor && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'No eres un profesor autorizado' },
        { status: 403 }
      );
    }

    // Obtener el studentId de los query params
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId es requerido' },
        { status: 400 }
      );
    }

    // Si es profesor, verificar que el estudiante pertenece a sus cursos
    // Si es super administrador, puede ver cualquier estudiante
    if (isProfesor && !isSuperAdmin) {
      const { data: cursosProfesor, error: cursosError } = await supabaseAdmin
        .from('profesores_cursos')
        .select('curso_id')
        .eq('profesor_id', user.id);

      if (cursosError) {
        return NextResponse.json(
          { error: 'Error al verificar cursos del profesor' },
          { status: 500 }
        );
      }

      const cursoIds = cursosProfesor?.map((cp: any) => cp.curso_id) || [];

      if (cursoIds.length === 0) {
        return NextResponse.json(
          { error: 'No tienes cursos asignados' },
          { status: 403 }
        );
      }

      // Verificar que el estudiante está en uno de los cursos del profesor
      const { data: estudianteCurso, error: estudianteCursoError } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('curso_id')
        .eq('estudiante_id', studentId)
        .in('curso_id', cursoIds)
        .limit(1);

      if (estudianteCursoError || !estudianteCurso || estudianteCurso.length === 0) {
        return NextResponse.json(
          { error: 'El estudiante no pertenece a tus cursos asignados' },
          { status: 403 }
        );
      }
    }

    // Obtener información del estudiante
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select('*')
      .eq('id', studentId)
      .single();

    if (estudianteError || !estudiante) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todos los intentos de quizes del estudiante
    const { data: intentosQuiz, error: intentosError } = await supabaseAdmin
      .from('intentos_quiz')
      .select(`
        *,
        quizzes (
          id,
          titulo,
          descripcion,
          subtema_id,
          subtemas (
            id,
            titulo,
            tema_id,
            temas (
              id,
              titulo,
              periodo_id,
              periodos (
                id,
                nombre,
                materia_id,
                materias (
                  id,
                  nombre,
                  curso_id,
                  cursos (
                    id,
                    nombre,
                    nivel
                  )
                )
              )
            )
          )
        )
      `)
      .eq('estudiante_id', studentId)
      .order('fecha_inicio', { ascending: false });

    // Obtener todas las respuestas del estudiante
    const { data: respuestas, error: respuestasError } = await supabaseAdmin
      .from('respuestas_estudiante')
      .select(`
        *,
        preguntas (
          id,
          texto,
          tiempo_segundos,
          opciones_respuesta (
            id,
            texto,
            es_correcta,
            explicacion
          )
        ),
        intentos_quiz (
          id,
          quiz_id,
          quizzes (
            id,
            titulo,
            subtema_id
          )
        )
      `)
      .eq('estudiante_id', studentId)
      .order('fecha_respuesta', { ascending: false });

    // Obtener intentos de evaluaciones de periodo
    const { data: intentosEvaluacion, error: intentosEvalError } = await supabaseAdmin
      .from('intentos_evaluacion')
      .select(`
        *,
        evaluaciones_periodo (
          id,
          titulo,
          descripcion,
          periodo_id,
          periodos (
            id,
            nombre,
            materia_id,
            materias (
              id,
              nombre,
              curso_id,
              cursos (
                id,
                nombre,
                nivel
              )
            )
          )
        )
      `)
      .eq('estudiante_id', studentId)
      .order('fecha_inicio', { ascending: false });

    // Calcular estadísticas
    const totalQuizes = intentosQuiz?.length || 0;
    const quizesCompletados = intentosQuiz?.filter((iq: any) => iq.estado === 'completado').length || 0;
    const promedioQuizes = intentosQuiz && intentosQuiz.length > 0
      ? intentosQuiz.reduce((sum: number, iq: any) => sum + (iq.calificacion || 0), 0) / intentosQuiz.length
      : 0;

    const totalEvaluaciones = intentosEvaluacion?.length || 0;
    const evaluacionesCompletadas = intentosEvaluacion?.filter((ie: any) => ie.estado === 'completado').length || 0;
    const promedioEvaluaciones = intentosEvaluacion && intentosEvaluacion.length > 0
      ? intentosEvaluacion.reduce((sum: number, ie: any) => sum + (ie.calificacion || 0), 0) / intentosEvaluacion.length
      : 0;

    const totalRespuestas = respuestas?.length || 0;
    const respuestasCorrectas = respuestas?.filter((r: any) => {
      const opcionCorrecta = r.preguntas?.opciones_respuesta?.find((op: any) => op.es_correcta);
      return opcionCorrecta && r.opcion_seleccionada_id === opcionCorrecta.id;
    }).length || 0;
    const porcentajeAciertos = totalRespuestas > 0 ? (respuestasCorrectas / totalRespuestas) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        estudiante,
        intentosQuiz: intentosQuiz || [],
        respuestas: respuestas || [],
        intentosEvaluacion: intentosEvaluacion || [],
        estadisticas: {
          totalQuizes,
          quizesCompletados,
          promedioQuizes: Math.round(promedioQuizes * 100) / 100,
          totalEvaluaciones,
          evaluacionesCompletadas,
          promedioEvaluaciones: Math.round(promedioEvaluaciones * 100) / 100,
          totalRespuestas,
          respuestasCorrectas,
          porcentajeAciertos: Math.round(porcentajeAciertos * 100) / 100,
        },
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-student-tracking:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

