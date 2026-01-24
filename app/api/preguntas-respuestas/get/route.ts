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

    // Verificar acceso al contenido
    const { data: contenido, error: contenidoError } = await supabaseAdmin
      .from('contenido')
      .select(`
        id,
        subtemas (
          temas (
            periodos (
              materias (
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

    if (!cursoId) {
      console.error('❌ No se pudo obtener cursoId del contenido:', {
        contenidoId,
        estructura: {
          tieneSubtemas: !!contenido.subtemas,
          tieneTemas: !!contenido.subtemas?.temas,
          tienePeriodos: !!contenido.subtemas?.temas?.periodos,
          tieneMaterias: !!contenido.subtemas?.temas?.periodos?.materias
        }
      });
      return NextResponse.json(
        { error: 'Error: No se pudo determinar el curso del contenido' },
        { status: 500 }
      );
    }

    // Verificar si es estudiante
    const { data: estudiante } = await supabaseAdmin
      .from('estudiantes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (estudiante) {
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
    } else {
      // Verificar si es profesor
      const { data: profesor } = await supabaseAdmin
        .from('profesores')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profesor) {
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
      } else {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 403 }
        );
      }
    }

    // Obtener preguntas (solo las que no son respuestas)
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from('preguntas_respuestas')
      .select('*')
      .eq('contenido_id', contenidoId)
      .eq('tipo', 'pregunta')
      .eq('eliminado', false)
      .order('creado_at', { ascending: false });

    if (preguntasError) {
      console.error('❌ Error al obtener preguntas:', preguntasError);
      
      // Si la tabla no existe, devolver un mensaje más claro
      if (preguntasError.message?.includes('does not exist') || preguntasError.message?.includes('no existe')) {
        return NextResponse.json(
          { 
            error: 'La tabla de preguntas y respuestas no existe. Por favor, ejecuta el script SQL create_preguntas_respuestas_table.sql en Supabase.',
            detalle: preguntasError.message
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error al obtener preguntas',
          detalle: preguntasError.message || 'Error desconocido'
        },
        { status: 500 }
      );
    }

    // Obtener respuestas para cada pregunta
    if (preguntas && preguntas.length > 0) {
      const preguntaIds = preguntas.map((p: any) => p.id);
      
      const { data: respuestas, error: respuestasError } = await supabaseAdmin
        .from('preguntas_respuestas')
        .select('*')
        .in('pregunta_id', preguntaIds)
        .eq('eliminado', false)
        .order('creado_at', { ascending: true });

      if (respuestasError) {
        console.error('Error al obtener respuestas:', respuestasError);
      }

      // Obtener información de autores (estudiantes y profesores)
      const autorIds = [
        ...new Set([
          ...preguntas.map((p: any) => p.autor_id),
          ...(respuestas || []).map((r: any) => r.autor_id),
        ]),
      ];

      const { data: estudiantes } = await supabaseAdmin
        .from('estudiantes')
        .select('user_id, nombre, apellido')
        .in('user_id', autorIds);

      const { data: profesores } = await supabaseAdmin
        .from('profesores')
        .select('id, nombre, apellido')
        .in('id', autorIds);

      // Crear mapa de autores
      const autoresMap = new Map();
      estudiantes?.forEach((e: any) => {
        autoresMap.set(e.user_id, {
          nombre: `${e.nombre || ''} ${e.apellido || ''}`.trim() || 'Estudiante',
          tipo: 'estudiante',
        });
      });
      profesores?.forEach((p: any) => {
        autoresMap.set(p.id, {
          nombre: `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Profesor',
          tipo: 'profesor',
        });
      });

      // Organizar preguntas con sus respuestas
      const preguntasConRespuestas = preguntas.map((pregunta: any) => {
        const respuestasDePregunta = (respuestas || []).filter(
          (r: any) => r.pregunta_id === pregunta.id
        );

        return {
          ...pregunta,
          autor: autoresMap.get(pregunta.autor_id) || { nombre: 'Usuario', tipo: 'estudiante' },
          respuestas: respuestasDePregunta.map((respuesta: any) => ({
            ...respuesta,
            autor: autoresMap.get(respuesta.autor_id) || { nombre: 'Usuario', tipo: 'profesor' },
          })),
        };
      });

      return NextResponse.json({
        success: true,
        data: preguntasConRespuestas,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: [],
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get preguntas-respuestas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

