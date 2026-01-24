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

    // Obtener el estudiante
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

    // Obtener todos los periodos de la materia con sus temas
    const { data: periodos, error: periodosError } = await supabaseAdmin
      .from('periodos')
      .select(`
        id,
        temas (
          id,
          orden,
          subtemas (
            id,
            orden
          )
        )
      `)
      .eq('materia_id', materia_id)
      .order('numero_periodo', { ascending: true });

    if (periodosError) {
      console.error('Error al obtener periodos:', periodosError);
      return NextResponse.json(
        { error: 'Error al obtener periodos' },
        { status: 500 }
      );
    }

    // Obtener todos los quizzes de los subtemas de esta materia
    const temaIds: string[] = [];
    const subtemaIds: string[] = [];
    
    periodos?.forEach((periodo: any) => {
      periodo.temas?.forEach((tema: any) => {
        temaIds.push(tema.id);
        tema.subtemas?.forEach((subtema: any) => {
          subtemaIds.push(subtema.id);
        });
      });
    });

    if (subtemaIds.length === 0) {
      return NextResponse.json({
        data: {
          temas_completados: {},
          evaluaciones_desbloqueadas: {},
        }
      });
    }

    // Obtener todos los quizzes de estos subtemas
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quizzes')
      .select('id, subtema_id, subtemas:subtema_id(tema_id)')
      .in('subtema_id', subtemaIds);

    if (quizzesError) {
      console.error('Error al obtener quizzes:', quizzesError);
      return NextResponse.json(
        { error: 'Error al obtener quizzes' },
        { status: 500 }
      );
    }

    // Obtener todos los intentos completados del estudiante
    const quizIds = quizzes?.map((q: any) => q.id) || [];
    
    if (quizIds.length === 0) {
      return NextResponse.json({
        data: {
          temas_completados: {},
          evaluaciones_desbloqueadas: {},
        }
      });
    }

    const { data: intentos, error: intentosError } = await supabaseAdmin
      .from('intentos_quiz')
      .select('quiz_id, completado')
      .eq('estudiante_id', estudiante.id)
      .eq('completado', true)
      .in('quiz_id', quizIds);

    if (intentosError) {
      console.error('Error al obtener intentos:', intentosError);
      return NextResponse.json(
        { error: 'Error al obtener intentos' },
        { status: 500 }
      );
    }

    // Crear mapa de quizzes completados por tema
    const quizzesCompletadosPorTema: Record<string, Set<string>> = {};
    const quizzesPorTema: Record<string, Set<string>> = {};

    quizzes?.forEach((quiz: any) => {
      const temaId = quiz.subtemas?.tema_id;
      if (temaId) {
        if (!quizzesPorTema[temaId]) {
          quizzesPorTema[temaId] = new Set();
        }
        quizzesPorTema[temaId].add(quiz.id);
      }
    });

    intentos?.forEach((intento: any) => {
      const quiz = quizzes?.find((q: any) => q.id === intento.quiz_id);
      if (quiz) {
        const temaId = quiz.subtemas?.tema_id;
        if (temaId) {
          if (!quizzesCompletadosPorTema[temaId]) {
            quizzesCompletadosPorTema[temaId] = new Set();
          }
          quizzesCompletadosPorTema[temaId].add(intento.quiz_id);
        }
      }
    });

    // Determinar qué temas están completados (todos sus quizzes completados)
    const temasCompletados: Record<string, boolean> = {};
    
    Object.keys(quizzesPorTema).forEach((temaId) => {
      const totalQuizzes = quizzesPorTema[temaId].size;
      const quizzesCompletados = quizzesCompletadosPorTema[temaId]?.size || 0;
      temasCompletados[temaId] = totalQuizzes > 0 && totalQuizzes === quizzesCompletados;
    });

    // Determinar qué evaluaciones están desbloqueadas (todos los temas del periodo completados)
    const evaluacionesDesbloqueadas: Record<string, boolean> = {};

    periodos?.forEach((periodo: any) => {
      const temasDelPeriodo = periodo.temas || [];
      const todosLosTemasCompletados = temasDelPeriodo.every((tema: any) => {
        // Si el tema no tiene quizzes, se considera completado
        if (!quizzesPorTema[tema.id] || quizzesPorTema[tema.id].size === 0) {
          return true;
        }
        return temasCompletados[tema.id] === true;
      });
      evaluacionesDesbloqueadas[periodo.id] = todosLosTemasCompletados;
    });

    return NextResponse.json({
      data: {
        temas_completados: temasCompletados,
        evaluaciones_desbloqueadas: evaluacionesDesbloqueadas,
      }
    });
  } catch (error: any) {
    console.error('Error en get-progreso:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

