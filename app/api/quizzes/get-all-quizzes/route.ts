import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener todos los quizzes
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (quizzesError) {
      console.error('Error al obtener quizzes:', quizzesError);
      return NextResponse.json(
        { error: quizzesError.message || 'Error al obtener los quizzes' },
        { status: 500 }
      );
    }

    // Obtener información de subtemas para cada quiz
    const quizzesConSubtemas = await Promise.all(
      (quizzes || []).map(async (quiz: any) => {
        if (!quiz.subtema_id) {
          return { ...quiz, subtemas: null };
        }

        const { data: subtema, error: subtemaError } = await supabaseAdmin
          .from('subtemas')
          .select(`
            id,
            nombre,
            tema_id,
            temas:tema_id (
              id,
              nombre
            )
          `)
          .eq('id', quiz.subtema_id)
          .single();

        if (subtemaError) {
          console.error('Error al obtener subtema:', subtemaError);
          return { ...quiz, subtemas: null };
        }

        return {
          ...quiz,
          subtemas: subtema,
        };
      })
    );

    return NextResponse.json(
      { data: quizzesConSubtemas || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-all-quizzes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

