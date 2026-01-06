import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quiz_id = searchParams.get('quiz_id');
    const subtema_id = searchParams.get('subtema_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('quizzes')
      .select('*');

    if (quiz_id) {
      query = query.eq('id', quiz_id);
    } else if (subtema_id) {
      query = query.eq('subtema_id', subtema_id);
    } else {
      return NextResponse.json(
        { error: 'Se requiere quiz_id o subtema_id' },
        { status: 400 }
      );
    }

    const { data: quizzes, error } = await query;

    if (error) {
      console.error('Error al obtener quizzes:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los quizzes' },
        { status: 500 }
      );
    }

    // Si se solicita un quiz específico, incluir preguntas y opciones
    if (quiz_id && quizzes && quizzes.length > 0) {
      const quiz = quizzes[0];
      
      // Obtener preguntas
      const { data: preguntas, error: preguntasError } = await supabaseAdmin
        .from('preguntas')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('orden', { ascending: true });

      if (preguntasError) {
        console.error('Error al obtener preguntas:', preguntasError);
        return NextResponse.json(
          { error: preguntasError.message || 'Error al obtener las preguntas' },
          { status: 500 }
        );
      }

      // Obtener opciones para cada pregunta
      const preguntasConOpciones = await Promise.all(
        (preguntas || []).map(async (pregunta) => {
          const { data: opciones, error: opcionesError } = await supabaseAdmin
            .from('opciones_respuesta')
            .select('*')
            .eq('pregunta_id', pregunta.id)
            .order('orden', { ascending: true });

          if (opcionesError) {
            console.error('Error al obtener opciones:', opcionesError);
            return { ...pregunta, opciones: [] };
          }

          return { ...pregunta, opciones: opciones || [] };
        })
      );

      return NextResponse.json(
        { data: { ...quiz, preguntas: preguntasConOpciones } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { data: quizzes || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

