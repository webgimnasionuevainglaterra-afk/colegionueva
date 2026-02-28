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

    // Obtener los cursos asignados al profesor (enfoque directo, más robusto que nested)
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

    const cursoIds = cursosAsignados?.map((pc: any) => pc.curso_id).filter(Boolean) || [];
    if (cursoIds.length === 0) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    // Obtener materias y periodos directamente (más confiable que estructura anidada)
    const { data: materias, error: materiasError } = await supabaseAdmin
      .from('materias')
      .select('id, nombre, curso_id, cursos(id, nombre, nivel)')
      .in('curso_id', cursoIds);

    if (materiasError || !materias?.length) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const materiaIds = materias.map((m: any) => m.id);
    const { data: periodos, error: periodosError } = await supabaseAdmin
      .from('periodos')
      .select('id, nombre, materia_id, materias(id, nombre, curso_id, cursos(id, nombre, nivel))')
      .in('materia_id', materiaIds);

    if (periodosError || !periodos?.length) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const periodoIds = periodos.map((p: any) => p.id);
    // Mapa periodo_id -> { materia, curso } para fallback cuando la estructura anidada del quiz falle
    const periodoToMateriaCurso = new Map<string, { materia: any; curso: any }>();
    periodos.forEach((p: any) => {
      const mat = p.materias;
      if (mat?.id) periodoToMateriaCurso.set(p.id, { materia: mat, curso: mat.cursos });
    });

    // Obtener temas y subtemas para los quizzes
    const { data: temas, error: temasError } = await supabaseAdmin
      .from('temas')
      .select(`
        id,
        periodo_id,
        subtemas (
          id,
          nombre
        )
      `)
      .in('periodo_id', periodoIds);

    const subtemaIds = temas?.flatMap((t: any) => 
      t.subtemas?.map((s: any) => s.id) || []
    ).filter(Boolean) || [];

    // Obtener quizzes con sus intentos y resultados
    let quizzesResults: any[] = [];
    if (subtemaIds.length > 0) {
      const { data: quizzesData, error: quizzesError } = await supabaseAdmin
        .from('quizzes')
        .select(`
          id,
          nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          subtema_id,
          subtemas (
            id,
            nombre,
            tema_id,
            temas (
              id,
              nombre,
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
        `)
        .in('subtema_id', subtemaIds);

      if (!quizzesError && quizzesData) {
        const quizIds = quizzesData.map((q: any) => q.id);
        // Obtener TODOS los intentos de todos los quizzes en una sola consulta (más rápido)
        const { data: todosIntentos, error: intentosError } = await supabaseAdmin
          .from('intentos_quiz')
          .select('id, quiz_id, estudiante_id, fecha_inicio, fecha_fin, calificacion, completado')
          .in('quiz_id', quizIds);

        // Pre-cargar estudiantes por curso (una consulta por cada curso único)
        const cursoIdsUnicos = new Set<string>();
        for (const quiz of quizzesData) {
          let cid = quiz.subtemas?.temas?.periodos?.materias?.cursos?.id;
          if (!cid) {
            const pid = quiz.subtemas?.temas?.periodos?.id || quiz.subtemas?.temas?.periodo_id;
            cid = periodoToMateriaCurso.get(pid)?.curso?.id;
          }
          if (cid) cursoIdsUnicos.add(cid);
        }
        const estudiantesPorCurso = new Map<string, any[]>();
        await Promise.all(Array.from(cursoIdsUnicos).map(async (cursoId) => {
          const { data } = await supabaseAdmin
            .from('estudiantes_cursos')
            .select('estudiante_id, estudiantes:estudiante_id(id, user_id, nombre, apellido, foto_url)')
            .eq('curso_id', cursoId);
          const list = (data || []).map((ec: any) => ec.estudiantes).filter(Boolean);
          estudiantesPorCurso.set(cursoId, list);
        }));

        const intentosPorQuiz = new Map<string, any[]>();
        (todosIntentos || []).forEach((i: any) => {
          const list = intentosPorQuiz.get(i.quiz_id) || [];
          list.push(i);
          intentosPorQuiz.set(i.quiz_id, list);
        });

        for (const quiz of quizzesData) {
          const intentos = intentosPorQuiz.get(quiz.id) || [];
          let cursoId = quiz.subtemas?.temas?.periodos?.materias?.cursos?.id;
          if (!cursoId) {
            const periodoId = quiz.subtemas?.temas?.periodos?.id || quiz.subtemas?.temas?.periodo_id;
            cursoId = periodoToMateriaCurso.get(periodoId)?.curso?.id;
          }
          if (!cursoId) continue;

          const estudiantesAsignados = estudiantesPorCurso.get(cursoId) || [];
            
            // IMPORTANTE: intentos usan auth.users.id (estudiante.user_id), NO estudiantes.id
            const estudiantesConResultados = estudiantesAsignados.map((estudiante: any) => {
              const idParaIntentos = estudiante.user_id || estudiante.id;
              const intento = intentos.find((i: any) => i.estudiante_id === idParaIntentos);
              return {
                estudiante: {
                  id: estudiante.id,
                  nombre: estudiante.nombre,
                  apellido: estudiante.apellido,
                  foto_url: estudiante.foto_url,
                },
                intento: intento ? {
                  id: intento.id,
                  fecha_inicio: intento.fecha_inicio,
                  fecha_fin: intento.fecha_fin,
                  calificacion: intento.calificacion,
                  completado: intento.completado,
                } : null,
                estado: intento ? (intento.completado ? 'completado' : 'en_progreso') : 'pendiente',
              };
            });

            const completados = estudiantesConResultados.filter((e: any) => e.estado === 'completado').length;
            const pendientes = estudiantesConResultados.filter((e: any) => e.estado === 'pendiente').length;
            const calificaciones = estudiantesConResultados
              .filter((e: any) => e.intento?.calificacion !== null && e.intento?.calificacion !== undefined)
              .map((e: any) => parseFloat(e.intento.calificacion));
            const promedio = calificaciones.length > 0
              ? calificaciones.reduce((sum: number, cal: number) => sum + cal, 0) / calificaciones.length
              : 0;

            const periodoData = quiz.subtemas?.temas?.periodos;
            const materiaData = periodoData?.materias || periodoToMateriaCurso.get(periodoData?.id)?.materia;
            const cursoData = materiaData?.cursos || periodoToMateriaCurso.get(periodoData?.id)?.curso;

            quizzesResults.push({
              id: quiz.id,
              nombre: quiz.nombre,
              descripcion: quiz.descripcion,
              tipo: 'quiz',
              fecha_inicio: quiz.fecha_inicio,
              fecha_fin: quiz.fecha_fin,
              curso: {
                id: cursoData?.id,
                nombre: cursoData?.nombre || 'N/A',
                nivel: cursoData?.nivel || 'N/A',
              },
              materia: {
                id: materiaData?.id,
                nombre: materiaData?.nombre || 'N/A',
              },
              periodo: {
                id: periodoData?.id,
                nombre: periodoData?.nombre || 'N/A',
              },
              subtema: {
                id: quiz.subtemas?.id,
                nombre: quiz.subtemas?.nombre || 'N/A',
              },
              estudiantes: estudiantesConResultados,
              estadisticas: {
                total: estudiantesAsignados.length,
                completados,
                pendientes,
                promedio: parseFloat(promedio.toFixed(2)),
              },
            });
        }
      }
    }

    // Obtener evaluaciones con sus intentos y resultados
    let evaluacionesResults: any[] = [];
    if (periodoIds.length > 0 && materiaIds.length > 0) {
      const { data: evaluacionesData, error: evaluacionesError } = await supabaseAdmin
        .from('evaluaciones_periodo')
        .select(`
          id,
          nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          periodo_id,
          materia_id,
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
          ),
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
        `)
        .in('periodo_id', periodoIds)
        .in('materia_id', materiaIds);

      if (!evaluacionesError && evaluacionesData) {
        const evalIds = evaluacionesData.map((e: any) => e.id);
        const { data: todosIntentosEval } = await supabaseAdmin
          .from('intentos_evaluacion')
          .select('id, evaluacion_id, estudiante_id, fecha_inicio, fecha_fin, calificacion, completado')
          .in('evaluacion_id', evalIds);

        const cursoIdsEval = new Set<string>();
        evaluacionesData.forEach((e: any) => {
          const cid = e.materias?.cursos?.id || e.periodos?.materias?.cursos?.id;
          if (cid) cursoIdsEval.add(cid);
        });
        const estudiantesPorCursoEval = new Map<string, any[]>();
        await Promise.all(Array.from(cursoIdsEval).map(async (cursoId) => {
          const { data } = await supabaseAdmin
            .from('estudiantes_cursos')
            .select('estudiante_id, estudiantes:estudiante_id(id, user_id, nombre, apellido, foto_url)')
            .eq('curso_id', cursoId);
          const list = (data || []).map((ec: any) => ec.estudiantes).filter(Boolean);
          estudiantesPorCursoEval.set(cursoId, list);
        }));

        const intentosPorEval = new Map<string, any[]>();
        (todosIntentosEval || []).forEach((i: any) => {
          const list = intentosPorEval.get(i.evaluacion_id) || [];
          list.push(i);
          intentosPorEval.set(i.evaluacion_id, list);
        });

        for (const evaluacion of evaluacionesData) {
          const intentos = intentosPorEval.get(evaluacion.id) || [];
          const cursoId = evaluacion.materias?.cursos?.id || evaluacion.periodos?.materias?.cursos?.id;
          if (!cursoId) continue;

          const estudiantesAsignados = estudiantesPorCursoEval.get(cursoId) || [];
            
            // IMPORTANTE: intentos usan auth.users.id (estudiante.user_id), NO estudiantes.id
            const estudiantesConResultados = estudiantesAsignados.map((estudiante: any) => {
              const idParaIntentos = estudiante.user_id || estudiante.id;
              const intento = intentos.find((i: any) => i.estudiante_id === idParaIntentos);
              return {
                estudiante: {
                  id: estudiante.id,
                  nombre: estudiante.nombre,
                  apellido: estudiante.apellido,
                  foto_url: estudiante.foto_url,
                },
                intento: intento ? {
                  id: intento.id,
                  fecha_inicio: intento.fecha_inicio,
                  fecha_fin: intento.fecha_fin,
                  calificacion: intento.calificacion,
                  completado: intento.completado,
                } : null,
                estado: intento ? (intento.completado ? 'completado' : 'en_progreso') : 'pendiente',
              };
            });

          const completados = estudiantesConResultados.filter((e: any) => e.estado === 'completado').length;
          const pendientes = estudiantesConResultados.filter((e: any) => e.estado === 'pendiente').length;
          const calificaciones = estudiantesConResultados
            .filter((e: any) => e.intento?.calificacion !== null && e.intento?.calificacion !== undefined)
            .map((e: any) => parseFloat(e.intento.calificacion));
          const promedio = calificaciones.length > 0
            ? calificaciones.reduce((sum: number, cal: number) => sum + cal, 0) / calificaciones.length
            : 0;

          evaluacionesResults.push({
              id: evaluacion.id,
              nombre: evaluacion.nombre,
              descripcion: evaluacion.descripcion,
              tipo: 'evaluacion',
              fecha_inicio: evaluacion.fecha_inicio,
              fecha_fin: evaluacion.fecha_fin,
              curso: {
                id: evaluacion.materias?.cursos?.id || evaluacion.periodos?.materias?.cursos?.id,
                nombre: evaluacion.materias?.cursos?.nombre || evaluacion.periodos?.materias?.cursos?.nombre,
                nivel: evaluacion.materias?.cursos?.nivel || evaluacion.periodos?.materias?.cursos?.nivel,
              },
              materia: {
                id: evaluacion.materias?.id,
                nombre: evaluacion.materias?.nombre,
              },
              periodo: {
                id: evaluacion.periodos?.id,
                nombre: evaluacion.periodos?.nombre,
              },
              estudiantes: estudiantesConResultados,
            estadisticas: {
              total: estudiantesAsignados.length,
              completados,
              pendientes,
              promedio: parseFloat(promedio.toFixed(2)),
            },
          });
        }
      }
    }

    // Combinar todos los resultados
    const todosLosResultados = [...quizzesResults, ...evaluacionesResults];

    return NextResponse.json({
      success: true,
      data: todosLosResultados,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-evaluations-results:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
















