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
    const contenidoId = searchParams.get('contenido_id');

    if (!contenidoId) {
      return NextResponse.json(
        { error: 'contenido_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tiene acceso al contenido (estudiante o profesor del curso)
    const { data: contenido, error: contenidoError } = await supabaseAdmin
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
                curso_id,
                cursos (
                  id
                )
              )
            )
          )
        )
      `)
      .eq('id', contenidoId)
      .single();

    if (contenidoError || !contenido) {
      return NextResponse.json(
        { error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    const cursoId = contenido.subtemas?.temas?.periodos?.materias?.curso_id;

    // Verificar si es estudiante y está inscrito en el curso
    const { data: estudiante } = await supabaseAdmin
      .from('estudiantes')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (estudiante) {
      const { data: estudianteEnCurso } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('id')
        .eq('estudiante_id', estudiante.id)
        .eq('curso_id', cursoId)
        .single();

      if (!estudianteEnCurso) {
        return NextResponse.json(
          { error: 'No tienes acceso a este contenido' },
          { status: 403 }
        );
      }
    } else {
      // Verificar si es profesor asignado al curso
      const { data: profesor } = await supabaseAdmin
        .from('profesores')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profesor) {
        const { data: profesorEnCurso } = await supabaseAdmin
          .from('profesores_cursos')
          .select('id')
          .eq('profesor_id', profesor.id)
          .eq('curso_id', cursoId)
          .single();

        if (!profesorEnCurso) {
          return NextResponse.json(
            { error: 'No tienes acceso a este contenido' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No tienes acceso a este contenido' },
          { status: 403 }
        );
      }
    }

    // Obtener todos los mensajes del foro para este contenido
    const { data: mensajes, error: mensajesError } = await supabaseAdmin
      .from('mensajes_foro')
      .select(`
        id,
        contenido_id,
        autor_id,
        contenido,
        respuesta_a,
        es_pregunta,
        respondido,
        editado,
        eliminado,
        created_at,
        updated_at
      `)
      .eq('contenido_id', contenidoId)
      .eq('eliminado', false)
      .order('created_at', { ascending: true });

    if (mensajesError) {
      console.error('Error al obtener mensajes:', mensajesError);
      return NextResponse.json(
        { error: 'Error al obtener los mensajes' },
        { status: 500 }
      );
    }

    // Obtener información de los autores (estudiantes y profesores)
    const autorIds = [...new Set(mensajes?.map((m: any) => m.autor_id) || [])];
    
    const { data: estudiantes } = await supabaseAdmin
      .from('estudiantes')
      .select('id, user_id, nombre, apellido')
      .in('user_id', autorIds);

    const { data: profesores } = await supabaseAdmin
      .from('profesores')
      .select('id, user_id, nombre, apellido')
      .in('user_id', autorIds);

    // Crear un mapa de autores
    const autoresMap = new Map();
    estudiantes?.forEach((e: any) => {
      autoresMap.set(e.user_id, { ...e, tipo: 'estudiante' });
    });
    profesores?.forEach((p: any) => {
      autoresMap.set(p.user_id, { ...p, tipo: 'profesor' });
    });

    // Enriquecer mensajes con información del autor
    const mensajesConAutores = mensajes?.map((mensaje: any) => {
      const autor = autoresMap.get(mensaje.autor_id);
      return {
        ...mensaje,
        autor: autor ? {
          nombre: `${autor.nombre} ${autor.apellido}`,
          tipo: autor.tipo,
        } : null,
      };
    }) || [];

    // Organizar mensajes en hilos (mensajes principales y sus respuestas)
    const mensajesPrincipales = mensajesConAutores.filter((m: any) => !m.respuesta_a);
    const mensajesPorId = new Map(mensajesConAutores.map((m: any) => [m.id, m]));

    const mensajesOrganizados = mensajesPrincipales.map((mensaje: any) => {
      const respuestas = mensajesConAutores.filter((m: any) => m.respuesta_a === mensaje.id);
      return {
        ...mensaje,
        respuestas: respuestas.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      };
    });

    return NextResponse.json({
      success: true,
      data: mensajesOrganizados,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-mensajes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


