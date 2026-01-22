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

    // Obtener todos los profesores con sus cursos asignados
    const { data: profesores, error: profesoresError } = await supabaseAdmin
      .from('profesores')
      .select('*')
      .order('created_at', { ascending: false });

    if (profesoresError) {
      console.error('Error al obtener profesores:', profesoresError);
      return NextResponse.json(
        { error: profesoresError.message || 'Error al obtener los profesores' },
        { status: 500 }
      );
    }

    // Obtener cursos asignados para cada profesor
    const profesoresConCursos = await Promise.all(
      (profesores || []).map(async (profesor) => {
        const { data: cursosAsignados } = await supabaseAdmin
          .from('profesores_cursos')
          .select(`
            curso_id,
            cursos:curso_id (
              id,
              nombre,
              nivel
            )
          `)
          .eq('profesor_id', profesor.id);

        return {
          ...profesor,
          cursos: cursosAsignados?.map((pc: any) => pc.cursos).filter(Boolean) || [],
        };
      })
    );

    return NextResponse.json(
      { data: profesoresConCursos },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-teachers:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





