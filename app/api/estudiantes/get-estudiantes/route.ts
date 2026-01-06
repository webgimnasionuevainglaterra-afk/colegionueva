import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const curso_id = searchParams.get('curso_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('estudiantes')
      .select(`
        *,
        acudientes (
          id,
          nombre,
          apellido,
          correo_electronico,
          numero_cedula,
          numero_telefono
        )
      `)
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    // Si se proporciona curso_id, filtrar estudiantes de ese curso
    if (curso_id) {
      const { data: estudiantesCursos } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('estudiante_id')
        .eq('curso_id', curso_id);

      const estudianteIds = estudiantesCursos?.map(ec => ec.estudiante_id) || [];
      
      if (estudianteIds.length > 0) {
        query = query.in('id', estudianteIds);
      } else {
        // Si no hay estudiantes en el curso, retornar array vacío
        return NextResponse.json(
          { data: [] },
          { status: 200 }
        );
      }
    }

    const { data: estudiantes, error } = await query;

    if (error) {
      console.error('Error al obtener estudiantes:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los estudiantes' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: estudiantes || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-estudiantes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

