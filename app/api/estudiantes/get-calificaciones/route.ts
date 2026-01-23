import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estudiante_id = searchParams.get('estudiante_id');

    if (!estudiante_id) {
      return NextResponse.json(
        { error: 'estudiante_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener calificaciones de quizzes
    const { data: intentosQuiz, error: errorQuiz } = await supabaseAdmin
      .from('intentos_quiz')
      .select(`
        id,
        calificacion,
        completado,
        fecha_fin,
        quizzes:quiz_id (
          id,
          nombre,
          subtemas:subtema_id (
            id,
            temas:tema_id (
              id,
              periodos:periodo_id (
                id,
                materias:materia_id (
                  id,
                  nombre
                )
              )
            )
          )
        )
      `)
      .eq('estudiante_id', estudiante_id)
      .eq('completado', true)
      .not('calificacion', 'is', null);

    if (errorQuiz) {
      console.error('Error al obtener intentos de quiz:', errorQuiz);
    }

    // Obtener calificaciones de evaluaciones
    const { data: intentosEvaluacion, error: errorEvaluacion } = await supabaseAdmin
      .from('intentos_evaluacion')
      .select(`
        id,
        calificacion,
        completado,
        fecha_fin,
        evaluaciones_periodo:evaluacion_id (
          id,
          nombre,
          materias:materia_id (
            id,
            nombre
          )
        )
      `)
      .eq('estudiante_id', estudiante_id)
      .eq('completado', true)
      .not('calificacion', 'is', null);

    if (errorEvaluacion) {
      console.error('Error al obtener intentos de evaluación:', errorEvaluacion);
    }

    // Organizar por materia
    const calificacionesPorMateria: Record<string, {
      materia_id: string;
      materia_nombre: string;
      quizzes: Array<{
        id: string;
        nombre: string;
        calificacion: number;
        fecha_fin: string;
        tipo: 'quiz';
      }>;
      evaluaciones: Array<{
        id: string;
        nombre: string;
        calificacion: number;
        fecha_fin: string;
        tipo: 'evaluacion';
      }>;
      promedio: number;
    }> = {};

    // Procesar quizzes
    if (intentosQuiz) {
      for (const intento of intentosQuiz) {
        const quiz = intento.quizzes as any;
        if (!quiz || !quiz.subtemas) continue;
        
        const subtema = Array.isArray(quiz.subtemas) ? quiz.subtemas[0] : quiz.subtemas;
        if (!subtema || !subtema.temas) continue;
        
        const tema = Array.isArray(subtema.temas) ? subtema.temas[0] : subtema.temas;
        if (!tema || !tema.periodos) continue;
        
        const periodo = Array.isArray(tema.periodos) ? tema.periodos[0] : tema.periodos;
        if (!periodo || !periodo.materias) continue;
        
        const materia = Array.isArray(periodo.materias) ? periodo.materias[0] : periodo.materias;
        if (!materia || !materia.id) continue;

        const materiaId = materia.id;
        const materiaNombre = materia.nombre;

        if (!calificacionesPorMateria[materiaId]) {
          calificacionesPorMateria[materiaId] = {
            materia_id: materiaId,
            materia_nombre: materiaNombre,
            quizzes: [],
            evaluaciones: [],
            promedio: 0,
          };
        }

        calificacionesPorMateria[materiaId].quizzes.push({
          id: intento.id,
          nombre: quiz.nombre || 'Quiz sin nombre',
          calificacion: parseFloat(intento.calificacion as any) || 0,
          fecha_fin: intento.fecha_fin || '',
          tipo: 'quiz',
        });
      }
    }

    // Procesar evaluaciones
    if (intentosEvaluacion) {
      for (const intento of intentosEvaluacion) {
        const evaluacion = intento.evaluaciones_periodo as any;
        if (!evaluacion || !evaluacion.materias) continue;

        const materia = Array.isArray(evaluacion.materias) ? evaluacion.materias[0] : evaluacion.materias;
        if (!materia || !materia.id) continue;

        const materiaId = materia.id;
        const materiaNombre = materia.nombre;

        if (!calificacionesPorMateria[materiaId]) {
          calificacionesPorMateria[materiaId] = {
            materia_id: materiaId,
            materia_nombre: materiaNombre,
            quizzes: [],
            evaluaciones: [],
            promedio: 0,
          };
        }

        calificacionesPorMateria[materiaId].evaluaciones.push({
          id: intento.id,
          nombre: evaluacion.nombre || 'Evaluación sin nombre',
          calificacion: parseFloat(intento.calificacion as any) || 0,
          fecha_fin: intento.fecha_fin || '',
          tipo: 'evaluacion',
        });
      }
    }

    // Calcular promedios
    for (const materiaId in calificacionesPorMateria) {
      const materia = calificacionesPorMateria[materiaId];
      const todasLasCalificaciones = [
        ...materia.quizzes.map(q => q.calificacion),
        ...materia.evaluaciones.map(e => e.calificacion),
      ];

      if (todasLasCalificaciones.length > 0) {
        const suma = todasLasCalificaciones.reduce((acc, cal) => acc + cal, 0);
        materia.promedio = parseFloat((suma / todasLasCalificaciones.length).toFixed(2));
      }
    }

    // Convertir a array y ordenar por nombre de materia
    const resultado = Object.values(calificacionesPorMateria).sort((a, b) =>
      a.materia_nombre.localeCompare(b.materia_nombre)
    );

    return NextResponse.json(
      { data: resultado },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-calificaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

