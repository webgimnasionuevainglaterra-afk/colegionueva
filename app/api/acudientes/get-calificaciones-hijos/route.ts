import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Endpoint para que el acudiente consulte las calificaciones de sus hijos
// usando su correo electrónico y los últimos 4 dígitos de su cédula.
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { correo_electronico, ultimos4_cedula } = body || {};

    if (!correo_electronico || !ultimos4_cedula) {
      return NextResponse.json(
        { error: 'correo_electronico y ultimos4_cedula son requeridos' },
        { status: 400 }
      );
    }

    // 1) Buscar acudiente por correo
    // Nota: usamos supabaseAdmin como cliente de servidor ya inicializado.
    const { data: acudiente, error: acudienteError } = await supabaseAdmin!
      .from('acudientes')
      .select('id, nombre, apellido, correo_electronico, numero_cedula')
      .eq('correo_electronico', correo_electronico)
      .maybeSingle();

    if (acudienteError || !acudiente) {
      return NextResponse.json(
        { error: 'No se encontró un acudiente con ese correo electrónico' },
        { status: 404 }
      );
    }

    // 2) Validar últimos 4 dígitos de la cédula
    const numeroCedula: string = acudiente.numero_cedula || '';
    const ultimos4Reales = numeroCedula.slice(-4);

    if (ultimos4Reales !== String(ultimos4_cedula)) {
      return NextResponse.json(
        { error: 'Los datos no coinciden. Verifica los últimos 4 dígitos de la cédula.' },
        { status: 401 }
      );
    }

    // 3) Obtener estudiantes asociados a este acudiente
    const { data: estudiantes, error: estudiantesError } = await supabaseAdmin!
      .from('estudiantes')
      .select('id, user_id, nombre, apellido, correo_electronico, tarjeta_identidad')
      .eq('acudiente_id', acudiente.id);

    if (estudiantesError) {
      console.error('Error al obtener estudiantes del acudiente:', estudiantesError);
      return NextResponse.json(
        { error: 'Error al obtener los estudiantes asociados' },
        { status: 500 }
      );
    }

    if (!estudiantes || estudiantes.length === 0) {
      return NextResponse.json(
        { error: 'Este acudiente no tiene estudiantes asociados' },
        { status: 404 }
      );
    }

    // 4) Para cada estudiante, reutilizar la lógica de get-calificaciones,
    //    pero organizando por PERIODO y por MATERIA.
    const resultados: any[] = [];

    for (const estudiante of estudiantes) {
      // Los intentos de quizzes/evaluaciones están asociados al user_id (id de auth),
      // no al id de la tabla estudiantes. Usamos ese campo para filtrar correctamente.
      const estudianteUserId = (estudiante as any).user_id as string | null;

      if (!estudianteUserId) {
        continue;
      }

      // Obtener calificaciones de quizzes (con información de periodo y materia)
      const { data: intentosQuiz } = await supabaseAdmin!
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
                  nombre,
                  numero_periodo,
                  materias:materia_id (
                    id,
                    nombre
                  )
                )
              )
            )
          )
        `)
        .eq('estudiante_id', estudianteUserId)
        .eq('completado', true)
        .not('calificacion', 'is', null);

      // Obtener calificaciones de evaluaciones (con información de periodo y materia)
      const { data: intentosEvaluacion } = await supabaseAdmin!
        .from('intentos_evaluacion')
        .select(`
          id,
          calificacion,
          completado,
          fecha_fin,
          evaluaciones_periodo:evaluacion_id (
            id,
            nombre,
            periodo_id,
            periodos (
              id,
              nombre,
              numero_periodo
            ),
            materias:materia_id (
              id,
              nombre
            )
          )
        `)
        .eq('estudiante_id', estudianteUserId)
        .eq('completado', true)
        .not('calificacion', 'is', null);

      // Organizar por PERIODO y, dentro de cada periodo, por MATERIA
      const calificacionesPorPeriodo: Record<string, {
        periodo_id: string;
        periodo_nombre: string;
        numero_periodo: number | null;
        materias: Record<string, {
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
        }>;
      }> = {};

      // Procesar quizzes (asignando periodo y materia)
      if (intentosQuiz) {
        for (const intento of intentosQuiz as any[]) {
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
          
          const periodoId = periodo.id as string;
          const periodoNombre = periodo.nombre || 'Periodo sin nombre';
          const numeroPeriodo = typeof periodo.numero_periodo === 'number'
            ? periodo.numero_periodo
            : parseInt(periodo.numero_periodo || '0', 10) || null;

          if (!calificacionesPorPeriodo[periodoId]) {
            calificacionesPorPeriodo[periodoId] = {
              periodo_id: periodoId,
              periodo_nombre: periodoNombre,
              numero_periodo: numeroPeriodo,
              materias: {},
            };
          }

          const materiaId = materia.id as string;
          const materiaNombre = materia.nombre;

          if (!calificacionesPorPeriodo[periodoId].materias[materiaId]) {
            calificacionesPorPeriodo[periodoId].materias[materiaId] = {
              materia_id: materiaId,
              materia_nombre: materiaNombre,
              quizzes: [],
              evaluaciones: [],
              promedio: 0,
            };
          }

          calificacionesPorPeriodo[periodoId].materias[materiaId].quizzes.push({
            id: intento.id,
            nombre: quiz.nombre || 'Quiz sin nombre',
            calificacion: parseFloat(intento.calificacion as any) || 0,
            fecha_fin: intento.fecha_fin || '',
            tipo: 'quiz',
          });
        }
      }

      // Procesar evaluaciones (asignando periodo y materia)
      if (intentosEvaluacion) {
        for (const intento of intentosEvaluacion as any[]) {
          const evaluacion = intento.evaluaciones_periodo as any;
          if (!evaluacion || !evaluacion.materias) continue;

          const materia = Array.isArray(evaluacion.materias) ? evaluacion.materias[0] : evaluacion.materias;
          if (!materia || !materia.id) continue;

          const periodo = evaluacion.periodos as any;
          if (!periodo || !periodo.id) continue;

          const periodoId = periodo.id as string;
          const periodoNombre = periodo.nombre || 'Periodo sin nombre';
          const numeroPeriodo = typeof periodo.numero_periodo === 'number'
            ? periodo.numero_periodo
            : parseInt(periodo.numero_periodo || '0', 10) || null;

          if (!calificacionesPorPeriodo[periodoId]) {
            calificacionesPorPeriodo[periodoId] = {
              periodo_id: periodoId,
              periodo_nombre: periodoNombre,
              numero_periodo: numeroPeriodo,
              materias: {},
            };
          }

          const materiaId = materia.id as string;
          const materiaNombre = materia.nombre;

          if (!calificacionesPorPeriodo[periodoId].materias[materiaId]) {
            calificacionesPorPeriodo[periodoId].materias[materiaId] = {
              materia_id: materiaId,
              materia_nombre: materiaNombre,
              quizzes: [],
              evaluaciones: [],
              promedio: 0,
            };
          }

          calificacionesPorPeriodo[periodoId].materias[materiaId].evaluaciones.push({
            id: intento.id,
            nombre: evaluacion.nombre || 'Evaluación sin nombre',
            calificacion: parseFloat(intento.calificacion as any) || 0,
            fecha_fin: intento.fecha_fin || '',
            tipo: 'evaluacion',
          });
        }
      }

      // Calcular promedios ponderados (70% quizzes, 30% evaluaciones) por materia y periodo
      for (const periodoId in calificacionesPorPeriodo) {
        const periodo = calificacionesPorPeriodo[periodoId];
        for (const materiaId in periodo.materias) {
          const materia = periodo.materias[materiaId];

          const promedioQuizzes =
            materia.quizzes.length > 0
              ? materia.quizzes.reduce((acc, q) => acc + q.calificacion, 0) / materia.quizzes.length
              : 0;

          const promedioEvaluaciones =
            materia.evaluaciones.length > 0
              ? materia.evaluaciones.reduce((acc, e) => acc + e.calificacion, 0) / materia.evaluaciones.length
              : 0;

          const notaFinal = (promedioQuizzes * 0.7) + (promedioEvaluaciones * 0.3);
          materia.promedio = parseFloat(notaFinal.toFixed(2));
        }
      }

      // Convertir a array ordenado por número de periodo y nombre de materia
      const periodosArray = Object.values(calificacionesPorPeriodo)
        .sort((a, b) => {
          const numA = a.numero_periodo ?? 0;
          const numB = b.numero_periodo ?? 0;
          if (numA !== numB) return numA - numB;
          return a.periodo_nombre.localeCompare(b.periodo_nombre);
        })
        .map((periodo) => ({
          periodo_id: periodo.periodo_id,
          periodo_nombre: periodo.periodo_nombre,
          numero_periodo: periodo.numero_periodo,
          materias: Object.values(periodo.materias).sort((a, b) =>
            a.materia_nombre.localeCompare(b.materia_nombre)
          ),
        }));

      resultados.push({
        estudiante,
        calificaciones: periodosArray,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          acudiente: {
            id: acudiente.id,
            nombre: acudiente.nombre,
            apellido: acudiente.apellido,
            correo_electronico: acudiente.correo_electronico,
          },
          estudiantes: resultados,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-calificaciones-hijos (acudientes):', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


