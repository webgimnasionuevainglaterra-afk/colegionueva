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

    // Obtener información del estudiante (incluye acudiente)
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select(`
        *,
        acudiente:acudientes (
          id,
          nombre,
          apellido,
          correo_electronico,
          numero_telefono,
          numero_cedula
        )
      `)
      .eq('id', studentId)
      .single();

    if (estudianteError || !estudiante) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    // IMPORTANTE: intentos_quiz e intentos_evaluacion usan auth.users.id (estudiante.user_id),
    // NO estudiantes.id. get-my-students pasa estudiantes.id, por eso debemos usar user_id.
    const estudianteUserId = (estudiante as any).user_id;
    const idParaIntentos = estudianteUserId || studentId; // Fallback si no tiene user_id

    // Obtener todos los intentos de quizes del estudiante
    const { data: intentosQuizRaw, error: intentosError } = await supabaseAdmin
      .from('intentos_quiz')
      .select(`
        *,
        quizzes (
          id,
          nombre,
          descripcion,
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
        )
      `)
      .eq('estudiante_id', idParaIntentos)
      .order('fecha_inicio', { ascending: false });

    // Agregar estado derivado de completado (la tabla no tiene columna estado)
    const intentosQuiz = (intentosQuizRaw || []).map((iq: any) => ({
      ...iq,
      estado: iq.completado ? 'completado' : 'en_progreso',
    }));

    // Obtener todas las respuestas del estudiante (respuestas_estudiante no tiene estudiante_id,
    // se filtra por intento_id de los intentos del estudiante)
    const intentoIds = intentosQuiz.map((iq: any) => iq.id);
    let respuestas: any[] = [];
    if (intentoIds.length > 0) {
      const { data: respuestasData, error: respuestasError } = await supabaseAdmin
        .from('respuestas_estudiante')
        .select(`
          *,
          preguntas (
            id,
            pregunta_texto,
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
              nombre,
              subtema_id
            )
          )
        `)
        .in('intento_id', intentoIds)
        .order('fecha_respuesta', { ascending: false });
      respuestas = respuestasData || [];
    }

    // Obtener intentos de evaluaciones de periodo
    const { data: intentosEvaluacionRaw, error: intentosEvalError } = await supabaseAdmin
      .from('intentos_evaluacion')
      .select(`
        *,
        evaluaciones_periodo (
          id,
          nombre,
          descripcion,
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
            nombre
          )
        )
      `)
      .eq('estudiante_id', idParaIntentos)
      .order('fecha_inicio', { ascending: false });

    // Agregar estado derivado de completado (la tabla no tiene columna estado)
    const intentosEvaluacion = (intentosEvaluacionRaw || []).map((ie: any) => ({
      ...ie,
      estado: ie.completado ? 'completado' : 'en_progreso',
    }));

    // Calcular estadísticas generales (solo completados para promedios)
    const totalQuizes = intentosQuiz?.length || 0;
    const quizesCompletados = intentosQuiz?.filter((iq: any) => iq.completado && iq.calificacion != null).length || 0;
    const quizesConNota = intentosQuiz?.filter((iq: any) => iq.completado && iq.calificacion != null) || [];
    const promedioQuizes = quizesConNota.length > 0
      ? quizesConNota.reduce((sum: number, iq: any) => sum + Number(iq.calificacion), 0) / quizesConNota.length
      : 0;

    const totalEvaluaciones = intentosEvaluacion?.length || 0;
    const evaluacionesCompletadas = intentosEvaluacion?.filter((ie: any) => ie.completado && ie.calificacion != null).length || 0;
    const evaluacionesConNota = intentosEvaluacion?.filter((ie: any) => ie.completado && ie.calificacion != null) || [];
    const promedioEvaluaciones = evaluacionesConNota.length > 0
      ? evaluacionesConNota.reduce((sum: number, ie: any) => sum + Number(ie.calificacion), 0) / evaluacionesConNota.length
      : 0;

    const totalRespuestas = respuestas?.length || 0;
    const respuestasCorrectas = respuestas?.filter((r: any) => {
      const opcionCorrecta = r.preguntas?.opciones_respuesta?.find((op: any) => op.es_correcta);
      return opcionCorrecta && r.opcion_seleccionada_id === opcionCorrecta.id;
    }).length || 0;
    const porcentajeAciertos = totalRespuestas > 0 ? (respuestasCorrectas / totalRespuestas) * 100 : 0;

    // Calcular notas finales por materia y periodo
    interface ClaveMateriaPeriodo {
      materiaId: string;
      periodoId: string;
    }

    const key = (mId: string, pId: string) => `${mId}__${pId}`;

    type AcumuladorNotas = {
      sumaQuizzes: number;
      countQuizzes: number;
      notaEvaluacion: number | null;
      materiaNombre: string;
      periodoNombre: string;
    };

    const notasPorMateriaPeriodo: Record<string, AcumuladorNotas> = {};

    const extraerMateriaPeriodoQuiz = (iq: any) => {
      const quiz = iq.quizzes;
      if (!quiz?.subtemas) return null;
      const subtema = Array.isArray(quiz.subtemas) ? quiz.subtemas[0] : quiz.subtemas;
      if (!subtema?.temas) return null;
      const tema = Array.isArray(subtema.temas) ? subtema.temas[0] : subtema.temas;
      if (!tema?.periodos) return null;
      const periodo = Array.isArray(tema.periodos) ? tema.periodos[0] : tema.periodos;
      if (!periodo?.materias) return null;
      const materia = Array.isArray(periodo.materias) ? periodo.materias[0] : periodo.materias;
      if (!materia?.id || !periodo?.id) return null;
      return {
        materiaId: materia.id,
        periodoId: periodo.id,
        materiaNombre: materia.nombre || 'Sin nombre',
        periodoNombre: periodo.nombre || 'Sin nombre',
      };
    };

    const extraerMateriaPeriodoEval = (ie: any) => {
      const ep = ie.evaluaciones_periodo;
      if (!ep) return null;
      const periodo = Array.isArray(ep.periodos) ? ep.periodos[0] : ep.periodos;
      const materia = ep.materias || periodo?.materias;
      const mat = Array.isArray(materia) ? materia[0] : materia;
      if (!mat?.id || !periodo?.id) return null;
      return {
        materiaId: mat.id,
        periodoId: periodo.id,
        materiaNombre: mat.nombre || 'Sin nombre',
        periodoNombre: periodo.nombre || 'Sin nombre',
      };
    };

    // Agrupar quizzes por materia/periodo (solo completados con calificación)
    (intentosQuiz || []).forEach((iq: any) => {
      if (!iq.completado || iq.calificacion == null) return;
      const info = extraerMateriaPeriodoQuiz(iq);
      if (!info) return;

      const k = key(info.materiaId, info.periodoId);
      if (!notasPorMateriaPeriodo[k]) {
        notasPorMateriaPeriodo[k] = {
          sumaQuizzes: 0,
          countQuizzes: 0,
          notaEvaluacion: null,
          materiaNombre: info.materiaNombre,
          periodoNombre: info.periodoNombre,
        };
      }
      notasPorMateriaPeriodo[k].sumaQuizzes += Number(iq.calificacion);
      notasPorMateriaPeriodo[k].countQuizzes += 1;
    });

    // Agrupar evaluaciones por materia/periodo (una por materia/periodo)
    (intentosEvaluacion || []).forEach((ie: any) => {
      if (!ie.completado || ie.calificacion == null) return;
      const info = extraerMateriaPeriodoEval(ie);
      if (!info) return;

      const k = key(info.materiaId, info.periodoId);
      if (!notasPorMateriaPeriodo[k]) {
        notasPorMateriaPeriodo[k] = {
          sumaQuizzes: 0,
          countQuizzes: 0,
          notaEvaluacion: null,
          materiaNombre: info.materiaNombre,
          periodoNombre: info.periodoNombre,
        };
      }
      notasPorMateriaPeriodo[k].notaEvaluacion = Number(ie.calificacion);
      notasPorMateriaPeriodo[k].materiaNombre = info.materiaNombre;
      notasPorMateriaPeriodo[k].periodoNombre = info.periodoNombre;
    });

    // Transformar en arreglo con nota final y estado
    const resumenMateriasPeriodos = Object.entries(notasPorMateriaPeriodo).map(([k, v]) => {
      const [materiaId, periodoId] = k.split('__');
      const promedioQuizzes = v.countQuizzes > 0 ? v.sumaQuizzes / v.countQuizzes : 0;
      const notaEvaluacion = v.notaEvaluacion ?? 0;

      const notaFinal = (promedioQuizzes * 0.70) + (notaEvaluacion * 0.30);
      const notaFinalRedondeada = Math.round(notaFinal * 100) / 100;

      const aprueba = notaFinalRedondeada >= 3.7;

      return {
        materiaId,
        periodoId,
        materiaNombre: v.materiaNombre,
        periodoNombre: v.periodoNombre,
        promedioQuizzes: Math.round(promedioQuizzes * 100) / 100,
        notaEvaluacion: Math.round(notaEvaluacion * 100) / 100,
        notaFinal: notaFinalRedondeada,
        aprueba,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        estudiante,
        intentosQuiz: intentosQuiz || [],
        respuestas: respuestas || [],
        intentosEvaluacion: intentosEvaluacion || [],
        notasMateriasPeriodos: resumenMateriasPeriodos,
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

