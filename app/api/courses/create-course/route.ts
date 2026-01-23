import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { nombre, nivel, profesores_ids, estudiantes_ids } = await request.json();

    if (!nombre || !nivel) {
      return NextResponse.json(
        { error: 'El nombre y el nivel son requeridos' },
        { status: 400 }
      );
    }

    const nivelesValidos = ['Primaria', 'Bachillerato', 'Técnico', 'Profesional'];
    if (!nivelesValidos.includes(nivel)) {
      return NextResponse.json(
        { error: `El nivel debe ser uno de: ${nivelesValidos.join(', ')}` },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Insertar curso en la tabla
    const { data: curso, error } = await supabaseAdmin
      .from('cursos')
      .insert([
        {
          nombre: nombre.trim(),
          nivel: nivel,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al crear el curso' },
        { status: 500 }
      );
    }

    // Asignar profesores si se proporcionaron
    if (profesores_ids && Array.isArray(profesores_ids) && profesores_ids.length > 0) {
      const profesoresAsignaciones = profesores_ids.map((profesor_id: string) => ({
        profesor_id: profesor_id,
        curso_id: curso.id,
      }));

      const { error: profesoresError } = await supabaseAdmin
        .from('profesores_cursos')
        .insert(profesoresAsignaciones);

      if (profesoresError) {
        console.warn('Error al asignar profesores al curso:', profesoresError);
        // No fallar si solo falla la asignación de profesores, pero registrar el error
      }
    }

    // Asignar estudiantes si se proporcionaron
    if (estudiantes_ids && Array.isArray(estudiantes_ids) && estudiantes_ids.length > 0) {
      // estudiantes_ids pueden ser user_id (de auth.users) o estudiantes.id
      // Intentar primero como user_id
      const { data: estudiantesPorUserId, error: errorPorUserId } = await supabaseAdmin
        .from('estudiantes')
        .select('id, user_id')
        .in('user_id', estudiantes_ids);

      // Si no encontramos por user_id, intentar como estudiantes.id directamente
      let estudiantesParaAsignar: any[] = [];
      if (!errorPorUserId && estudiantesPorUserId && estudiantesPorUserId.length > 0) {
        estudiantesParaAsignar = estudiantesPorUserId;
      } else {
        // Intentar como estudiantes.id directamente
        const { data: estudiantesPorId, error: errorPorId } = await supabaseAdmin
          .from('estudiantes')
          .select('id, user_id')
          .in('id', estudiantes_ids);

        if (!errorPorId && estudiantesPorId) {
          estudiantesParaAsignar = estudiantesPorId;
        }
      }

      if (estudiantesParaAsignar.length > 0) {
        const estudiantesAsignaciones = estudiantesParaAsignar.map((estudiante: any) => ({
          estudiante_id: estudiante.id, // Usar estudiantes.id, no user_id
          curso_id: curso.id,
        }));

        const { error: estudiantesError } = await supabaseAdmin
          .from('estudiantes_cursos')
          .insert(estudiantesAsignaciones);

        if (estudiantesError) {
          console.warn('Error al asignar estudiantes al curso:', estudiantesError);
          // No fallar si solo falla la asignación de estudiantes, pero registrar el error
        }
      }
    }

    return NextResponse.json(
      { message: 'Curso creado exitosamente', data: curso },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-course:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

