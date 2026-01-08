import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
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

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
    }

    // Verificar que el usuario es un profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profesorError || !profesor) {
      return NextResponse.json(
        { error: 'No eres un profesor autorizado' },
        { status: 403 }
      );
    }

    // Obtener cursos asignados al profesor con sus alumnos
    const { data: cursosAsignados, error: cursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select(`
        curso_id,
        cursos (
          id,
          nombre,
          nivel
        )
      `)
      .eq('profesor_id', user.id);

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    const cursos = cursosAsignados?.map((pc: any) => pc.cursos).filter(Boolean) || [];

    // Obtener materias de los cursos
    const cursoIds = cursos.map((c: any) => c.id);
    const { data: materias, error: materiasError } = await supabaseAdmin
      .from('materias')
      .select('id, nombre, curso_id')
      .in('curso_id', cursoIds);

    if (materiasError) {
      console.error('Error al obtener materias:', materiasError);
      return NextResponse.json(
        { error: materiasError.message || 'Error al obtener las materias' },
        { status: 500 }
      );
    }

    const materiaIds = materias?.map((m: any) => m.id) || [];

    // Obtener periodos de las materias
    const { data: periodos, error: periodosError } = await supabaseAdmin
      .from('periodos')
      .select('id, nombre, materia_id')
      .in('materia_id', materiaIds);

    if (periodosError) {
      console.error('Error al obtener periodos:', periodosError);
      return NextResponse.json(
        { error: periodosError.message || 'Error al obtener los periodos' },
        { status: 500 }
      );
    }

    const periodoIds = periodos?.map((p: any) => p.id) || [];

    // Obtener temas y subtemas para quizzes
    let subtemaIds: string[] = [];
    if (periodoIds.length > 0) {
      const { data: temas, error: temasError } = await supabaseAdmin
        .from('temas')
        .select('id, subtemas (id)')
        .in('periodo_id', periodoIds);

      if (!temasError && temas) {
        subtemaIds = temas.flatMap((t: any) => t.subtemas?.map((s: any) => s.id) || []).filter(Boolean);
      }
    }

    // Obtener quizzes
    let quizIds: string[] = [];
    if (subtemaIds.length > 0) {
      const { data: quizzes, error: quizzesError } = await supabaseAdmin
        .from('quizzes')
        .select('id')
        .in('subtema_id', subtemaIds);

      if (!quizzesError && quizzes) {
        quizIds = quizzes.map((q: any) => q.id);
      }
    }

    // Obtener evaluaciones
    let evaluacionIds: string[] = [];
    if (periodoIds.length > 0 && materiaIds.length > 0) {
      const { data: evaluaciones, error: evaluacionesError } = await supabaseAdmin
        .from('evaluaciones_periodo')
        .select('id')
        .in('periodo_id', periodoIds)
        .in('materia_id', materiaIds);

      if (!evaluacionesError && evaluaciones) {
        evaluacionIds = evaluaciones.map((e: any) => e.id);
      }
    }

    // Para cada curso, calcular la participación
    const participacionPorCurso = await Promise.all(
      cursos.map(async (curso: any) => {
        // Obtener alumnos del curso
        const { data: estudiantesCurso, error: estudiantesError } = await supabaseAdmin
          .from('estudiantes_cursos')
          .select('estudiante_id')
          .eq('curso_id', curso.id);

        if (estudiantesError || !estudiantesCurso) {
          return {
            curso: {
              id: curso.id,
              nombre: curso.nombre,
              nivel: curso.nivel,
            },
            totalAlumnos: 0,
            alumnosConQuizzes: 0,
            alumnosConEvaluaciones: 0,
            alumnosPendientes: 0,
            porcentajeQuizzes: 0,
            porcentajeEvaluaciones: 0,
          };
        }

        const estudianteIds = estudiantesCurso.map((ec: any) => ec.estudiante_id);
        const totalAlumnos = estudianteIds.length;

        // Obtener user_ids de los estudiantes
        const { data: estudiantesData } = await supabaseAdmin
          .from('estudiantes')
          .select('id, user_id')
          .in('id', estudianteIds);

        const estudianteUserIds = estudiantesData?.map((e: any) => e.user_id).filter(Boolean) || [];
        const estudianteIdToUserId = new Map(estudiantesData?.map((e: any) => [e.id, e.user_id]) || []);

        // Obtener alumnos que han presentado quizzes
        let alumnosConQuizzes = 0;
        const estudiantesIdsConQuizzes = new Set<string>();
        if (quizIds.length > 0 && estudianteUserIds.length > 0) {
          const { data: intentosQuiz, error: intentosError } = await supabaseAdmin
            .from('intentos_quiz')
            .select('estudiante_id')
            .in('quiz_id', quizIds)
            .in('estudiante_id', estudianteUserIds);

          if (!intentosError && intentosQuiz) {
            const estudiantesConIntentos = new Set(intentosQuiz.map((i: any) => i.estudiante_id));
            // Convertir user_ids a estudiante_ids
            estudiantesData?.forEach((e: any) => {
              if (estudiantesConIntentos.has(e.user_id)) {
                estudiantesIdsConQuizzes.add(e.id);
              }
            });
            alumnosConQuizzes = estudiantesIdsConQuizzes.size;
          }
        }

        // Obtener alumnos que han presentado evaluaciones
        let alumnosConEvaluaciones = 0;
        const estudiantesIdsConEvaluaciones = new Set<string>();
        if (evaluacionIds.length > 0 && estudianteUserIds.length > 0) {
          const { data: intentosEvaluacion, error: intentosEvalError } = await supabaseAdmin
            .from('intentos_evaluacion')
            .select('estudiante_id')
            .in('evaluacion_id', evaluacionIds)
            .in('estudiante_id', estudianteUserIds);

          if (!intentosEvalError && intentosEvaluacion) {
            const estudiantesConIntentos = new Set(intentosEvaluacion.map((i: any) => i.estudiante_id));
            // Convertir user_ids a estudiante_ids
            estudiantesData?.forEach((e: any) => {
              if (estudiantesConIntentos.has(e.user_id)) {
                estudiantesIdsConEvaluaciones.add(e.id);
              }
            });
            alumnosConEvaluaciones = estudiantesIdsConEvaluaciones.size;
          }
        }

        // Alumnos que han presentado al menos un quiz o evaluación
        const alumnosConActividades = new Set<string>();
        
        // Usar los sets ya calculados
        estudiantesIdsConQuizzes.forEach(id => alumnosConActividades.add(id));
        estudiantesIdsConEvaluaciones.forEach(id => alumnosConActividades.add(id));

        const alumnosPendientes = totalAlumnos - alumnosConActividades.size;
        const porcentajeQuizzes = totalAlumnos > 0 ? (alumnosConQuizzes / totalAlumnos) * 100 : 0;
        const porcentajeEvaluaciones = totalAlumnos > 0 ? (alumnosConEvaluaciones / totalAlumnos) * 100 : 0;

        return {
          curso: {
            id: curso.id,
            nombre: curso.nombre,
            nivel: curso.nivel,
          },
          totalAlumnos,
          alumnosConQuizzes,
          alumnosConEvaluaciones,
          alumnosPendientes,
          porcentajeQuizzes: Math.round(porcentajeQuizzes * 100) / 100,
          porcentajeEvaluaciones: Math.round(porcentajeEvaluaciones * 100) / 100,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: participacionPorCurso,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-course-participation:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

