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

    // Obtener los cursos asignados al profesor
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
            nombre,
            periodos (
              id,
              nombre,
              fecha_inicio,
              fecha_fin
            )
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

    const cursoIds = cursosAsignados?.map((pc: any) => pc.cursos?.id).filter(Boolean) || [];
    const materiaIds = cursosAsignados?.flatMap((pc: any) => 
      pc.cursos?.materias?.map((m: any) => m.id) || []
    ).filter(Boolean) || [];
    const periodoIds = cursosAsignados?.flatMap((pc: any) => 
      pc.cursos?.materias?.flatMap((m: any) => 
        m.periodos?.map((p: any) => p.id) || []
      ) || []
    ).filter(Boolean) || [];

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
        // Para cada quiz, obtener los intentos de los estudiantes
        for (const quiz of quizzesData) {
          const { data: intentos, error: intentosError } = await supabaseAdmin
            .from('intentos_quiz')
            .select(`
              id,
              estudiante_id,
              fecha_inicio,
              fecha_fin,
              calificacion,
              completado,
              estudiantes:estudiante_id (
                id,
                nombre,
                apellido,
                foto_url
              )
            `)
            .eq('quiz_id', quiz.id);

          if (!intentosError && intentos) {
            // Obtener estudiantes asignados al curso
            const cursoId = quiz.subtemas?.temas?.periodos?.materias?.cursos?.id;
            const { data: estudiantesCurso } = await supabaseAdmin
              .from('estudiantes_cursos')
              .select(`
                estudiante_id,
                estudiantes:estudiante_id (
                  id,
                  nombre,
                  apellido,
                  foto_url
                )
              `)
              .eq('curso_id', cursoId);

            const estudiantesAsignados = estudiantesCurso?.map((ec: any) => ec.estudiantes).filter(Boolean) || [];
            
            // Crear lista completa de estudiantes (con y sin intentos)
            const estudiantesConResultados = estudiantesAsignados.map((estudiante: any) => {
              const intento = intentos.find((i: any) => i.estudiante_id === estudiante.id);
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

            quizzesResults.push({
              id: quiz.id,
              nombre: quiz.nombre,
              descripcion: quiz.descripcion,
              tipo: 'quiz',
              fecha_inicio: quiz.fecha_inicio,
              fecha_fin: quiz.fecha_fin,
              curso: {
                id: quiz.subtemas?.temas?.periodos?.materias?.cursos?.id,
                nombre: quiz.subtemas?.temas?.periodos?.materias?.cursos?.nombre,
                nivel: quiz.subtemas?.temas?.periodos?.materias?.cursos?.nivel,
              },
              materia: {
                id: quiz.subtemas?.temas?.periodos?.materias?.id,
                nombre: quiz.subtemas?.temas?.periodos?.materias?.nombre,
              },
              periodo: {
                id: quiz.subtemas?.temas?.periodos?.id,
                nombre: quiz.subtemas?.temas?.periodos?.nombre,
              },
              subtema: {
                id: quiz.subtemas?.id,
                nombre: quiz.subtemas?.nombre,
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
        // Para cada evaluación, obtener los intentos de los estudiantes
        for (const evaluacion of evaluacionesData) {
          const { data: intentos, error: intentosError } = await supabaseAdmin
            .from('intentos_evaluacion')
            .select(`
              id,
              estudiante_id,
              fecha_inicio,
              fecha_fin,
              calificacion,
              completado,
              estudiantes:estudiante_id (
                id,
                nombre,
                apellido,
                foto_url
              )
            `)
            .eq('evaluacion_id', evaluacion.id);

          if (!intentosError && intentos) {
            // Obtener estudiantes asignados al curso
            const cursoId = evaluacion.materias?.cursos?.id || evaluacion.periodos?.materias?.cursos?.id;
            const { data: estudiantesCurso } = await supabaseAdmin
              .from('estudiantes_cursos')
              .select(`
                estudiante_id,
                estudiantes:estudiante_id (
                  id,
                  nombre,
                  apellido,
                  foto_url
                )
              `)
              .eq('curso_id', cursoId);

            const estudiantesAsignados = estudiantesCurso?.map((ec: any) => ec.estudiantes).filter(Boolean) || [];
            
            // Crear lista completa de estudiantes (con y sin intentos)
            const estudiantesConResultados = estudiantesAsignados.map((estudiante: any) => {
              const intento = intentos.find((i: any) => i.estudiante_id === estudiante.id);
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






