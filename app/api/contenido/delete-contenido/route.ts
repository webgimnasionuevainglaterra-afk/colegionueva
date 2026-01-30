import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Validar permisos del profesor (si es profesor)
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (!userError && user) {
        // Verificar si es profesor
        const { data: profesor, error: profesorError } = await supabaseAdmin
          .from('profesores')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profesorError && profesor) {
          // Obtener el contenido para saber a qué subtema pertenece
          const { data: contenidoActual, error: contenidoError } = await supabaseAdmin
            .from('contenido')
            .select(`
              id,
              subtema_id,
              subtemas (
                id,
                tema_id,
                temas (
                  id,
                  periodo_id,
                  periodos (
                    id,
                    materia_id,
                    materias (
                      id,
                      curso_id
                    )
                  )
                )
              )
            `)
            .eq('id', id)
            .single();

          if (contenidoError || !contenidoActual) {
            return NextResponse.json(
              { error: 'Contenido no encontrado' },
              { status: 404 }
            );
          }

          const cursoId = contenidoActual.subtemas?.temas?.periodos?.materias?.curso_id;
          if (!cursoId) {
            return NextResponse.json(
              { error: 'No se pudo determinar el curso del contenido' },
              { status: 400 }
            );
          }

          // Verificar que el profesor tiene asignado este curso
          const { data: cursoAsignado, error: cursoError } = await supabaseAdmin
            .from('profesores_cursos')
            .select('id')
            .eq('profesor_id', user.id)
            .eq('curso_id', cursoId)
            .single();

          if (cursoError || !cursoAsignado) {
            return NextResponse.json(
              { error: 'No tienes permiso para eliminar contenido de este curso' },
              { status: 403 }
            );
          }
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('contenido')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar contenido:', error);
      return NextResponse.json(
        { error: error.message || 'Error al eliminar el contenido' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Contenido eliminado exitosamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en delete-contenido:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}












