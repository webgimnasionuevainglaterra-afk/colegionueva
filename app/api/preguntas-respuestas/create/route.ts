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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { contenido_id, texto, pregunta_id } = body;

    if (!contenido_id || !texto || !texto.trim()) {
      return NextResponse.json(
        { error: 'contenido_id y texto son requeridos' },
        { status: 400 }
      );
    }

    // Verificar acceso al contenido
    const { data: contenido, error: contenidoError } = await supabaseAdmin
      .from('contenido')
      .select(`
        id,
        subtemas (
          temas (
            periodos (
              materias (
                curso_id
              )
            )
          )
        )
      `)
      .eq('id', contenido_id)
      .single();

    if (contenidoError || !contenido) {
      return NextResponse.json(
        { error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    const cursoId = contenido.subtemas?.temas?.periodos?.materias?.curso_id;

    // Determinar tipo: pregunta o respuesta
    let tipo: 'pregunta' | 'respuesta' = 'pregunta';
    let esEstudiante = false;
    let esProfesor = false;

    // Verificar si es estudiante
    const { data: estudiante } = await supabaseAdmin
      .from('estudiantes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (estudiante) {
      esEstudiante = true;
      const { data: estudianteEnCurso } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('id')
        .eq('estudiante_id', estudiante.id)
        .eq('curso_id', cursoId)
        .maybeSingle();

      if (!estudianteEnCurso) {
        return NextResponse.json(
          { error: 'No tienes acceso a este contenido' },
          { status: 403 }
        );
      }
    }

    // Verificar si es profesor
    const { data: profesor } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profesor) {
      esProfesor = true;
      const { data: profesorEnCurso } = await supabaseAdmin
        .from('profesores_cursos')
        .select('id')
        .eq('profesor_id', profesor.id)
        .eq('curso_id', cursoId)
        .maybeSingle();

      if (!profesorEnCurso) {
        return NextResponse.json(
          { error: 'No tienes acceso a este contenido' },
          { status: 403 }
        );
      }
    }

    if (!esEstudiante && !esProfesor) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Si hay pregunta_id, es una respuesta (solo profesores pueden responder)
    if (pregunta_id) {
      if (!esProfesor) {
        return NextResponse.json(
          { error: 'Solo los profesores pueden responder preguntas' },
          { status: 403 }
        );
      }
      tipo = 'respuesta';

      // Verificar que la pregunta existe
      const { data: pregunta } = await supabaseAdmin
        .from('preguntas_respuestas')
        .select('id')
        .eq('id', pregunta_id)
        .eq('contenido_id', contenido_id)
        .eq('tipo', 'pregunta')
        .eq('eliminado', false)
        .single();

      if (!pregunta) {
        return NextResponse.json(
          { error: 'La pregunta no existe' },
          { status: 404 }
        );
      }
    } else {
      // Es una pregunta (solo estudiantes pueden hacer preguntas)
      if (!esEstudiante) {
        return NextResponse.json(
          { error: 'Solo los estudiantes pueden hacer preguntas' },
          { status: 403 }
        );
      }
      tipo = 'pregunta';
    }

    // Crear la pregunta o respuesta
    const nuevoRegistro = {
      contenido_id,
      autor_id: user.id,
      tipo,
      pregunta_id: pregunta_id || null,
      texto: texto.trim(),
      eliminado: false,
    };

    const { data: registroCreado, error: insertError } = await supabaseAdmin
      .from('preguntas_respuestas')
      .insert(nuevoRegistro)
      .select()
      .single();

    if (insertError) {
      console.error('Error al crear pregunta/respuesta:', insertError);
      return NextResponse.json(
        { error: `Error al crear: ${insertError.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

    // Obtener información del autor
    let autorNombre = 'Usuario';
    let autorTipo: 'estudiante' | 'profesor' = 'estudiante';

    if (esEstudiante && estudiante) {
      const { data: estudianteData } = await supabaseAdmin
        .from('estudiantes')
        .select('nombre, apellido')
        .eq('id', estudiante.id)
        .single();

      if (estudianteData) {
        autorNombre = `${estudianteData.nombre || ''} ${estudianteData.apellido || ''}`.trim() || 'Estudiante';
        autorTipo = 'estudiante';
      }
    } else if (esProfesor && profesor) {
      const { data: profesorData } = await supabaseAdmin
        .from('profesores')
        .select('nombre, apellido')
        .eq('id', profesor.id)
        .single();

      if (profesorData) {
        autorNombre = `${profesorData.nombre || ''} ${profesorData.apellido || ''}`.trim() || 'Profesor';
        autorTipo = 'profesor';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...registroCreado,
        autor: {
          nombre: autorNombre,
          tipo: autorTipo,
        },
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en create preguntas-respuestas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

