import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verificar el usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar que sea super administrador
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('role')
      .eq('id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'No tienes permiso para acceder a esta función' },
        { status: 403 }
      );
    }

    // Obtener todos los cursos
    const { data: cursos, error: cursosError } = await supabaseAdmin
      .from('cursos')
      .select('id, nombre, nivel')
      .order('nombre', { ascending: true });

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    // Para cada curso, obtener materias y calcular rendimiento
    const cursosConRendimiento = await Promise.all(
      (cursos || []).map(async (curso) => {
        // Obtener materias del curso
        const { data: materias, error: materiasError } = await supabaseAdmin
          .from('materias')
          .select('id, nombre, curso_id')
          .eq('curso_id', curso.id)
          .order('nombre', { ascending: true });

        if (materiasError) {
          console.error(`Error al obtener materias del curso ${curso.id}:`, materiasError);
          return { ...curso, materias: [] };
        }

        // Obtener estudiantes del curso
        const { data: estudiantesCursos, error: estudiantesError } = await supabaseAdmin
          .from('estudiantes_cursos')
          .select('estudiante_id')
          .eq('curso_id', curso.id);

        const estudianteIds = estudiantesCursos?.map((ec: any) => ec.estudiante_id) || [];
        const totalEstudiantes = estudianteIds.length;

        // Para cada materia, calcular rendimiento
        const materiasConRendimiento = await Promise.all(
          (materias || []).map(async (materia) => {
            // Obtener periodos de la materia
            const { data: periodos, error: periodosError } = await supabaseAdmin
              .from('periodos')
              .select('id')
              .eq('materia_id', materia.id);

            if (periodosError || !periodos) {
              return {
                ...materia,
                estadisticas: {
                  totalQuizzes: 0,
                  totalEvaluaciones: 0,
                  promedioQuizzes: 0,
                  promedioEvaluaciones: 0,
                  promedioGeneral: 0,
                  estudiantesActivos: 0,
                  participacion: 0,
                },
              };
            }

            const periodoIds = periodos.map((p: any) => p.id);

            // Obtener temas de los periodos
            const { data: temas, error: temasError } = await supabaseAdmin
              .from('temas')
              .select('id')
              .in('periodo_id', periodoIds);

            if (temasError || !temas) {
              return {
                ...materia,
                estadisticas: {
                  totalQuizzes: 0,
                  totalEvaluaciones: 0,
                  promedioQuizzes: 0,
                  promedioEvaluaciones: 0,
                  promedioGeneral: 0,
                  estudiantesActivos: 0,
                  participacion: 0,
                },
              };
            }

            const temaIds = temas.map((t: any) => t.id);

            // Obtener subtemas de los temas
            const { data: subtemas, error: subtemasError } = await supabaseAdmin
              .from('subtemas')
              .select('id')
              .in('tema_id', temaIds);

            if (subtemasError || !subtemas) {
              return {
                ...materia,
                estadisticas: {
                  totalQuizzes: 0,
                  totalEvaluaciones: 0,
                  promedioQuizzes: 0,
                  promedioEvaluaciones: 0,
                  promedioGeneral: 0,
                  estudiantesActivos: 0,
                  participacion: 0,
                },
              };
            }

            const subtemaIds = subtemas.map((s: any) => s.id);

            // Obtener quizzes de los subtemas
            const { data: quizzes, error: quizzesError } = await supabaseAdmin
              .from('quizzes')
              .select('id')
              .in('subtema_id', subtemaIds);

            const totalQuizzes = quizzes?.length || 0;

            // Obtener evaluaciones de los periodos
            const { data: evaluaciones, error: evaluacionesError } = await supabaseAdmin
              .from('evaluaciones_periodo')
              .select('id')
              .in('periodo_id', periodoIds);

            const totalEvaluaciones = evaluaciones?.length || 0;

            // Calcular promedios de quizzes
            let promedioQuizzes = 0;
            let estudiantesConQuizzes = new Set<string>();

            if (totalQuizzes > 0 && estudianteIds.length > 0) {
              const { data: intentosQuiz, error: intentosError } = await supabaseAdmin
                .from('intentos_quiz')
                .select('estudiante_id, calificacion, completado')
                .in('quiz_id', quizzes?.map((q: any) => q.id) || []);

              if (!intentosError && intentosQuiz) {
                const calificaciones = intentosQuiz
                  .filter((iq: any) => iq.completado && iq.calificacion !== null)
                  .map((iq: any) => parseFloat(iq.calificacion) || 0);

                if (calificaciones.length > 0) {
                  promedioQuizzes = calificaciones.reduce((sum, cal) => sum + cal, 0) / calificaciones.length;
                }

                intentosQuiz.forEach((iq: any) => {
                  if (iq.completado) estudiantesConQuizzes.add(iq.estudiante_id);
                });
              }
            }

            // Calcular promedios de evaluaciones
            let promedioEvaluaciones = 0;
            let estudiantesConEvaluaciones = new Set<string>();

            if (totalEvaluaciones > 0 && estudianteIds.length > 0) {
              const { data: intentosEval, error: intentosEvalError } = await supabaseAdmin
                .from('intentos_evaluacion')
                .select('estudiante_id, calificacion, completado')
                .in('evaluacion_id', evaluaciones?.map((e: any) => e.id) || []);

              if (!intentosEvalError && intentosEval) {
                const calificaciones = intentosEval
                  .filter((ie: any) => ie.completado && ie.calificacion !== null)
                  .map((ie: any) => parseFloat(ie.calificacion) || 0);

                if (calificaciones.length > 0) {
                  promedioEvaluaciones = calificaciones.reduce((sum, cal) => sum + cal, 0) / calificaciones.length;
                }

                intentosEval.forEach((ie: any) => {
                  if (ie.completado) estudiantesConEvaluaciones.add(ie.estudiante_id);
                });
              }
            }

            // Calcular promedio general
            const promedios = [];
            if (promedioQuizzes > 0) promedios.push(promedioQuizzes);
            if (promedioEvaluaciones > 0) promedios.push(promedioEvaluaciones);
            const promedioGeneral = promedios.length > 0
              ? promedios.reduce((sum, p) => sum + p, 0) / promedios.length
              : 0;

            // Calcular estudiantes activos (que han completado al menos un quiz o evaluación)
            const estudiantesActivos = new Set([
              ...Array.from(estudiantesConQuizzes),
              ...Array.from(estudiantesConEvaluaciones),
            ]).size;

            // Calcular participación
            const participacion = totalEstudiantes > 0
              ? (estudiantesActivos / totalEstudiantes) * 100
              : 0;

            return {
              ...materia,
              estadisticas: {
                totalQuizzes,
                totalEvaluaciones,
                promedioQuizzes: parseFloat(promedioQuizzes.toFixed(2)),
                promedioEvaluaciones: parseFloat(promedioEvaluaciones.toFixed(2)),
                promedioGeneral: parseFloat(promedioGeneral.toFixed(2)),
                estudiantesActivos,
                totalEstudiantes,
                participacion: parseFloat(participacion.toFixed(1)),
              },
            };
          })
        );

        // Calcular promedio general del curso
        const promediosMaterias = materiasConRendimiento
          .map((m: any) => m.estadisticas.promedioGeneral)
          .filter((p: number) => p > 0);

        const promedioCurso = promediosMaterias.length > 0
          ? promediosMaterias.reduce((sum, p) => sum + p, 0) / promediosMaterias.length
          : 0;

        return {
          ...curso,
          materias: materiasConRendimiento,
          estadisticas: {
            promedioGeneral: parseFloat(promedioCurso.toFixed(2)),
            totalEstudiantes,
            totalMaterias: materiasConRendimiento.length,
          },
        };
      })
    );

    return NextResponse.json(
      { success: true, data: cursosConRendimiento },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-courses-performance:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


