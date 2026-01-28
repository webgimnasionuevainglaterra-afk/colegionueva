import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materia_id = searchParams.get('materia_id');

    if (!materia_id) {
      return NextResponse.json(
        { error: 'materia_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el usuario autenticado
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Obtener el estudiante y su curso
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (estudianteError || !estudiante) {
      return NextResponse.json(
        { error: 'No se encontró información del estudiante' },
        { status: 403 }
      );
    }

    // Obtener el curso del estudiante
    const { data: estudianteCurso, error: cursoError } = await supabaseAdmin
      .from('estudiantes_cursos')
      .select('curso_id')
      .eq('estudiante_id', estudiante.id)
      .limit(1)
      .maybeSingle();

    if (cursoError || !estudianteCurso) {
      return NextResponse.json(
        { error: 'El estudiante no está inscrito en ningún curso' },
        { status: 403 }
      );
    }

    // Verificar que la materia pertenece al curso del estudiante
    const { data: materia, error: materiaError } = await supabaseAdmin
      .from('materias')
      .select('id, curso_id')
      .eq('id', materia_id)
      .eq('curso_id', estudianteCurso.curso_id)
      .maybeSingle();

    if (materiaError || !materia) {
      return NextResponse.json(
        { error: 'La materia no pertenece al curso del estudiante' },
        { status: 403 }
      );
    }

    // Obtener periodos de la materia SOLO del curso del estudiante, con sus temas, subtemas y contenido
    const { data, error } = await supabaseAdmin
      .from('periodos')
      .select(`
        id,
        nombre,
        numero_periodo,
        fecha_inicio,
        fecha_fin,
        temas (
          id,
          nombre,
          orden,
          subtemas (
            id,
            nombre,
            descripcion,
            orden,
            contenido (
              id,
              titulo,
              tipo,
              descripcion,
              url,
              archivo_url,
              orden
            )
          )
        )
      `)
      .eq('materia_id', materia_id)
      .order('numero_periodo', { ascending: true });

    if (error) {
      console.error('Error al obtener contenidos de la materia:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los contenidos de la materia' },
        { status: 500 }
      );
    }

    // Obtener todos los subtemas de los temas para verificar quizzes
    const subtemaIds: string[] = [];
    (data || []).forEach((periodo: any) => {
      periodo.temas?.forEach((tema: any) => {
        tema.subtemas?.forEach((subtema: any) => {
          subtemaIds.push(subtema.id);
        });
      });
    });

    // Obtener todos los quizzes de estos subtemas
    let quizzesPorSubtema: Record<string, string[]> = {};
    if (subtemaIds.length > 0) {
      const { data: quizzes } = await supabaseAdmin
        .from('quizzes')
        .select('id, subtema_id')
        .in('subtema_id', subtemaIds);

      quizzes?.forEach((quiz: any) => {
        if (!quizzesPorSubtema[quiz.subtema_id]) {
          quizzesPorSubtema[quiz.subtema_id] = [];
        }
        quizzesPorSubtema[quiz.subtema_id].push(quiz.id);
      });
    }

    // Obtener todos los intentos del estudiante y determinar cuáles quizzes están APROBADOS
    // Regla de negocio: se considera APROBADO cuando la calificación es >= 3.7
    const NOTA_MINIMA_APROBACION = 3.7;

    const todosLosQuizIds = Object.values(quizzesPorSubtema).flat();
    // Guardar SOLO el ÚLTIMO intento completado de cada quiz (por fecha),
    // y usar su calificación para decidir si está aprobado o no.
    const ultimoIntentoPorQuiz: Record<string, { fecha: number; calificacion: number }> = {};
    
    if (todosLosQuizIds.length > 0) {
      const { data: intentos } = await supabaseAdmin
        .from('intentos_quiz')
        .select('quiz_id, calificacion, completado, fecha_inicio, fecha_fin')
        .eq('estudiante_id', estudiante.id)
        .in('quiz_id', todosLosQuizIds);

      intentos?.forEach((intento: any) => {
        if (!intento.completado) return;

        const calificacionNumerica = intento.calificacion !== null && intento.calificacion !== undefined
          ? parseFloat(intento.calificacion)
          : null;

        if (calificacionNumerica === null || Number.isNaN(calificacionNumerica)) {
          return;
        }

        const fechaRef = intento.fecha_fin || intento.fecha_inicio;
        if (!fechaRef) return;

        const timestamp = new Date(fechaRef).getTime();
        if (Number.isNaN(timestamp)) return;

        const existing = ultimoIntentoPorQuiz[intento.quiz_id];
        if (!existing || timestamp > existing.fecha) {
          ultimoIntentoPorQuiz[intento.quiz_id] = {
            fecha: timestamp,
            calificacion: calificacionNumerica,
          };
        }
      });
    }

    // Eliminar duplicados de contenido basándose en el ID y agregar información de desbloqueo
    const periodosSinDuplicados = (data || []).map((periodo: any) => {
      const temasDelPeriodo = periodo.temas || [];
      
      // Determinar qué temas están completados (todos sus quizzes APROBADOS)
      const temasCompletados: Record<string, boolean> = {};
      temasDelPeriodo.forEach((tema: any) => {
        let todosLosQuizzesAprobados = true;
        let tieneQuizzes = false;
        
        tema.subtemas?.forEach((subtema: any) => {
          const quizIds = quizzesPorSubtema[subtema.id] || [];
          if (quizIds.length > 0) {
            tieneQuizzes = true;
            const todosAprobados = quizIds.every((quizId: string) => {
              const intento = ultimoIntentoPorQuiz[quizId];
              return intento && intento.calificacion >= NOTA_MINIMA_APROBACION;
            });
            if (!todosAprobados) {
              todosLosQuizzesAprobados = false;
            }
          }
        });
        
        // Si no tiene quizzes, se considera completado.
        // Si tiene quizzes, solo se considera completado cuando TODOS sus quizzes están APROBADOS.
        temasCompletados[tema.id] = !tieneQuizzes || todosLosQuizzesAprobados;
      });

      // Determinar si todos los temas del periodo están completados
      const todosLosTemasCompletados = temasDelPeriodo.every((tema: any) => 
        temasCompletados[tema.id] === true
      );

      const temasSinDuplicados = (periodo.temas || []).map((tema: any, index: number) => {
        // Determinar si el tema está desbloqueado
        // El primer tema siempre está desbloqueado
        // Los siguientes temas están desbloqueados si el tema anterior está completado
        let desbloqueado = false;
        if (index === 0) {
          desbloqueado = true;
        } else {
          const temaAnterior = temasDelPeriodo[index - 1];
          desbloqueado = temasCompletados[temaAnterior.id] === true;
        }
        const subtemasSinDuplicados = (tema.subtemas || []).map((subtema: any) => {
          // Eliminar duplicados de contenido por ID
          const contenidoUnico = (subtema.contenido || []).reduce((acc: any[], contenido: any) => {
            // Evitar duplicados por ID o por mismo título y tipo
            if (
              !acc.find(
                (c: any) =>
                  c.id === contenido.id ||
                  (c.titulo === contenido.titulo && c.tipo === contenido.tipo)
              )
            ) {
              acc.push(contenido);
            }
            return acc;
          }, []);
          
          // Ordenar contenido por orden
          contenidoUnico.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
          
          return {
            ...subtema,
            contenido: contenidoUnico,
          };
        });
        
        // Ordenar subtemas por orden
        subtemasSinDuplicados.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        
        return {
          ...tema,
          subtemas: subtemasSinDuplicados,
          desbloqueado: desbloqueado,
          completado: temasCompletados[tema.id] === true,
        };
      });
      
      // Ordenar temas por orden
      temasSinDuplicados.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
      
      return {
        ...periodo,
        temas: temasSinDuplicados,
        evaluacion_desbloqueada: todosLosTemasCompletados,
      };
    });

    return NextResponse.json(
      { data: periodosSinDuplicados },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-materia-contenidos:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


