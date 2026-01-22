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

    // 1. Obtener cursos asignados al profesor
    const { data: cursosAsignados, error: cursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select('curso_id')
      .eq('profesor_id', user.id);

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    const cursoIds = cursosAsignados?.map((pc: any) => pc.curso_id) || [];

    // 2. Obtener total de alumnos en esos cursos
    let totalAlumnos = 0;
    if (cursoIds.length > 0) {
      const { data: estudiantesCursos, error: estudiantesError } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('estudiante_id')
        .in('curso_id', cursoIds);

      if (!estudiantesError && estudiantesCursos) {
        // Contar estudiantes únicos
        const estudiantesUnicos = new Set(estudiantesCursos.map((ec: any) => ec.estudiante_id));
        totalAlumnos = estudiantesUnicos.size;
      }
    }

    // 3. Obtener total de quizzes creados por el profesor (a través de sus cursos)
    let totalQuizzes = 0;
    if (cursoIds.length > 0) {
      // Obtener materias de los cursos
      const { data: materias, error: materiasError } = await supabaseAdmin
        .from('materias')
        .select('id')
        .in('curso_id', cursoIds);

      if (!materiasError && materias) {
        const materiaIds = materias.map((m: any) => m.id);

        // Obtener periodos de las materias
        const { data: periodos, error: periodosError } = await supabaseAdmin
          .from('periodos')
          .select('id')
          .in('materia_id', materiaIds);

        if (!periodosError && periodos) {
          const periodoIds = periodos.map((p: any) => p.id);

          // Obtener temas de los periodos
          const { data: temas, error: temasError } = await supabaseAdmin
            .from('temas')
            .select('id')
            .in('periodo_id', periodoIds);

          if (!temasError && temas) {
            const temaIds = temas.map((t: any) => t.id);

            // Obtener subtemas de los temas
            const { data: subtemas, error: subtemasError } = await supabaseAdmin
              .from('subtemas')
              .select('id')
              .in('tema_id', temaIds);

            if (!subtemasError && subtemas) {
              const subtemaIds = subtemas.map((s: any) => s.id);

              // Obtener quizzes de los subtemas
              const { data: quizzes, error: quizzesError } = await supabaseAdmin
                .from('quizzes')
                .select('id')
                .in('subtema_id', subtemaIds);

              if (!quizzesError && quizzes) {
                totalQuizzes = quizzes.length;
              }
            }
          }
        }
      }
    }

    // 4. Obtener total de evaluaciones creadas por el profesor
    let totalEvaluaciones = 0;
    if (cursoIds.length > 0) {
      // Obtener materias de los cursos
      const { data: materias, error: materiasError } = await supabaseAdmin
        .from('materias')
        .select('id')
        .in('curso_id', cursoIds);

      if (!materiasError && materias) {
        const materiaIds = materias.map((m: any) => m.id);

        // Obtener periodos de las materias
        const { data: periodos, error: periodosError } = await supabaseAdmin
          .from('periodos')
          .select('id')
          .in('materia_id', materiaIds);

        if (!periodosError && periodos) {
          const periodoIds = periodos.map((p: any) => p.id);

          // Obtener evaluaciones de los periodos y materias
          const { data: evaluaciones, error: evaluacionesError } = await supabaseAdmin
            .from('evaluaciones_periodo')
            .select('id')
            .in('periodo_id', periodoIds)
            .in('materia_id', materiaIds);

          if (!evaluacionesError && evaluaciones) {
            totalEvaluaciones = evaluaciones.length;
          }
        }
      }
    }

    // 5. Obtener total de cursos
    const totalCursos = cursoIds.length;

    return NextResponse.json({
      success: true,
      data: {
        totalAlumnos,
        totalCursos,
        totalQuizzes,
        totalEvaluaciones,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-dashboard-stats:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





