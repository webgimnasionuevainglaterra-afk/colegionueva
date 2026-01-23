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

    // Obtener todos los cursos con profesores y estudiantes asignados
    const { data: cursos, error } = await supabaseAdmin
      .from('cursos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener cursos:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    // Para cada curso, obtener profesores y estudiantes asignados
    const cursosConRelaciones = await Promise.all(
      (cursos || []).map(async (curso) => {
        // Obtener profesores asignados
        const { data: profesoresAsignados } = await supabaseAdmin
          .from('profesores_cursos')
          .select(`
            profesor_id,
            profesores:profesor_id (
              id,
              nombre,
              apellido,
              email
            )
          `)
          .eq('curso_id', curso.id);

        // Obtener estudiantes asignados
        const { data: estudiantesAsignados } = await supabaseAdmin
          .from('estudiantes_cursos')
          .select(`
            estudiante_id,
            estudiantes:estudiante_id (
              id,
              nombre,
              apellido,
              correo_electronico
            )
          `)
          .eq('curso_id', curso.id);

        return {
          ...curso,
          profesores: profesoresAsignados?.map((pc: any) => pc.profesores).filter(Boolean) || [],
          estudiantes: estudiantesAsignados?.map((ec: any) => ec.estudiantes).filter(Boolean) || [],
        };
      })
    );

    return NextResponse.json(
      { data: cursosConRelaciones || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-courses:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





