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

    // Obtener cursos asignados al profesor
    const { data: cursosAsignados, error: cursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select(`
        curso_id,
        cursos (
          id,
          nombre,
          nivel,
          materias (
            id,
            nombre
          )
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
    const cursoIds = cursos.map((c: any) => c.id);

    // Obtener alumnos de los cursos
    const { data: estudiantesCursos, error: estudiantesError } = await supabaseAdmin
      .from('estudiantes_cursos')
      .select(`
        estudiante_id,
        curso_id,
        estudiantes (
          id,
          nombre,
          apellido,
          foto_url,
          user_id
        )
      `)
      .in('curso_id', cursoIds);

    if (estudiantesError) {
      console.error('Error al obtener estudiantes:', estudiantesError);
      return NextResponse.json(
        { error: estudiantesError.message || 'Error al obtener los estudiantes' },
        { status: 500 }
      );
    }

    // Obtener materias de los cursos
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

    // Obtener intentos de quizzes y evaluaciones para calcular promedios
    const estudianteIds = estudiantesCursos?.map((ec: any) => ec.estudiante_id) || [];

    // Calcular promedios por estudiante y materia
    const alertas: any[] = [];
    const alumnosSinIntentos: any[] = [];

    for (const estudianteCurso of estudiantesCursos || []) {
      const estudiante = estudianteCurso.estudiantes;
      if (!estudiante || !estudiante.user_id) continue;

      const estudianteUserId = estudiante.user_id; // user_id de auth.users
      const estudianteId = estudiante.id; // id de la tabla estudiantes
      const cursoId = estudianteCurso.curso_id;

      // Obtener intentos de quizzes (usando user_id de auth.users)
      let intentosQuiz: any[] = [];
      if (quizIds.length > 0) {
        const { data: intentosQuizData } = await supabaseAdmin
          .from('intentos_quiz')
          .select(`
            calificacion,
            quiz_id,
            quizzes (
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
                    materia_id
                  )
                )
              )
            )
          `)
          .eq('estudiante_id', estudianteUserId)
          .in('quiz_id', quizIds);

        intentosQuiz = intentosQuizData || [];
      }

      // Obtener intentos de evaluaciones (usando user_id de auth.users)
      let intentosEvaluacion: any[] = [];
      if (evaluacionIds.length > 0) {
        const { data: intentosEvaluacionData } = await supabaseAdmin
          .from('intentos_evaluacion')
          .select(`
            calificacion,
            evaluacion_id,
            evaluaciones_periodo (
              id,
              materia_id
            )
          `)
          .eq('estudiante_id', estudianteUserId)
          .in('evaluacion_id', evaluacionIds);

        intentosEvaluacion = intentosEvaluacionData || [];
      }

      // Verificar si el estudiante tiene intentos
      const tieneIntentos = intentosQuiz.length > 0 || intentosEvaluacion.length > 0;

      if (!tieneIntentos) {
        // Obtener curso del estudiante
        const curso = cursos.find((c: any) => c.id === cursoId);
        alumnosSinIntentos.push({
          estudiante: {
            id: estudiante.id,
            nombre: estudiante.nombre,
            apellido: estudiante.apellido,
            foto_url: estudiante.foto_url,
          },
          curso: curso ? {
            id: curso.id,
            nombre: curso.nombre,
            nivel: curso.nivel,
          } : null,
        });
      }

      // Calcular promedio por materia
      const promediosPorMateria: { [materiaId: string]: { calificaciones: number[], materia: any } } = {};

      // Agregar calificaciones de quizzes
      for (const intento of intentosQuiz) {
        const materiaId = intento.quizzes?.subtemas?.temas?.periodos?.materia_id;
        if (materiaId && intento.calificacion !== null) {
          if (!promediosPorMateria[materiaId]) {
            const materia = materias?.find((m: any) => m.id === materiaId);
            promediosPorMateria[materiaId] = {
              calificaciones: [],
              materia: materia || { id: materiaId, nombre: 'N/A' },
            };
          }
          promediosPorMateria[materiaId].calificaciones.push(parseFloat(intento.calificacion));
        }
      }

      // Agregar calificaciones de evaluaciones
      for (const intento of intentosEvaluacion) {
        const materiaId = intento.evaluaciones_periodo?.materia_id;
        if (materiaId && intento.calificacion !== null) {
          if (!promediosPorMateria[materiaId]) {
            const materia = materias?.find((m: any) => m.id === materiaId);
            promediosPorMateria[materiaId] = {
              calificaciones: [],
              materia: materia || { id: materiaId, nombre: 'N/A' },
            };
          }
          promediosPorMateria[materiaId].calificaciones.push(parseFloat(intento.calificacion));
        }
      }

      // Calcular promedios y detectar alumnos con promedio bajo (< 3.0)
      for (const materiaId in promediosPorMateria) {
        const { calificaciones, materia } = promediosPorMateria[materiaId];
        if (calificaciones.length > 0) {
          const promedio = calificaciones.reduce((sum, cal) => sum + cal, 0) / calificaciones.length;
          
          if (promedio < 3.0) {
            const curso = cursos.find((c: any) => c.id === cursoId);
            alertas.push({
              estudiante: {
                id: estudiante.id,
                nombre: estudiante.nombre,
                apellido: estudiante.apellido,
                foto_url: estudiante.foto_url,
              },
              curso: curso ? {
                id: curso.id,
                nombre: curso.nombre,
                nivel: curso.nivel,
              } : null,
              materia: {
                id: materia.id,
                nombre: materia.nombre,
              },
              promedio: Math.round(promedio * 100) / 100,
              totalCalificaciones: calificaciones.length,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alumnosConPromedioBajo: alertas,
        alumnosSinIntentos: alumnosSinIntentos,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-performance-alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

