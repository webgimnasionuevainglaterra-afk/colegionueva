import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contenido_id = searchParams.get('contenido_id');

    if (!contenido_id) {
      return NextResponse.json(
        { error: 'contenido_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener el contenido con toda su información relacionada
    const { data: contenido, error: contenidoError } = await supabaseAdmin
      .from('contenido')
      .select(`
        *,
        subtemas (
          id,
          nombre,
          descripcion,
          orden,
          tema_id,
          temas (
            id,
            nombre,
            descripcion,
            orden,
            periodo_id,
            periodos (
              id,
              nombre,
              numero_periodo,
              materia_id,
              materias (
                id,
                nombre,
                curso_id
              )
            )
          )
        )
      `)
      .eq('id', contenido_id)
      .single();

    if (contenidoError) {
      console.error('Error al obtener contenido:', contenidoError);
      return NextResponse.json(
        { error: contenidoError.message || 'Error al obtener el contenido' },
        { status: 500 }
      );
    }

    if (!contenido) {
      return NextResponse.json(
        { error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar acceso según el rol del usuario
    const materiaId = contenido.subtemas?.temas?.periodos?.materias?.id;
    const cursoId = contenido.subtemas?.temas?.periodos?.materias?.curso_id;

    if (!materiaId || !cursoId) {
      return NextResponse.json(
        { error: 'Información incompleta del contenido' },
        { status: 500 }
      );
    }

    // Verificar si es estudiante
    const { data: estudiante } = await supabaseAdmin
      .from('estudiantes')
      .select('curso_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (estudiante) {
      // Verificar que el estudiante pertenece al curso del contenido
      if (estudiante.curso_id !== cursoId) {
        return NextResponse.json(
          { error: 'No tienes acceso a este contenido' },
          { status: 403 }
        );
      }
    } else {
      // Verificar si es profesor
      const { data: profesor } = await supabaseAdmin
        .from('profesores')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profesor) {
        // Verificar que el profesor está asignado al curso
        const { data: profesorCurso } = await supabaseAdmin
          .from('profesores_cursos')
          .select('curso_id')
          .eq('profesor_id', profesor.id)
          .eq('curso_id', cursoId)
          .maybeSingle();

        if (!profesorCurso) {
          return NextResponse.json(
            { error: 'No tienes acceso a este contenido' },
            { status: 403 }
          );
        }
      } else {
        // Si no es estudiante ni profesor, verificar si es admin
        const { data: admin } = await supabaseAdmin
          .from('administrators')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!admin) {
          return NextResponse.json(
            { error: 'No autorizado' },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({
      data: contenido,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-contenido-by-id:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
