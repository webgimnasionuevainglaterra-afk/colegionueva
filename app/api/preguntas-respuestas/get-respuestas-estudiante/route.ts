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

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
    }

    // Verificar que el usuario es un estudiante
    const { data: estudiante } = await supabaseAdmin
      .from('estudiantes')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!estudiante) {
      return NextResponse.json(
        { error: 'Usuario no es un estudiante' },
        { status: 403 }
      );
    }

    // Obtener todas las preguntas del estudiante
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from('preguntas_respuestas')
      .select('*')
      .eq('autor_id', user.id)
      .eq('tipo', 'pregunta')
      .eq('eliminado', false)
      .order('creado_at', { ascending: false });

    if (preguntasError) {
      return NextResponse.json(
        { error: 'Error al obtener preguntas' },
        { status: 500 }
      );
    }

    if (!preguntas || preguntas.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Obtener todas las respuestas de estas preguntas
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

    // Obtener información de autores (profesores que respondieron)
    const autorIdsRespuestas = [
      ...new Set((respuestas || []).map((r: any) => r.autor_id)),
    ];

    const { data: profesores } = await supabaseAdmin
      .from('profesores')
      .select('id, nombre, apellido')
      .in('id', autorIdsRespuestas);

    // Crear mapa de profesores
    const profesoresMap = new Map();
    profesores?.forEach((p: any) => {
      profesoresMap.set(p.id, {
        nombre: `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Profesor',
        tipo: 'profesor',
      });
    });

    // Obtener información de contenidos con toda su estructura relacionada
    const contenidoIds = [...new Set(preguntas.map((p: any) => p.contenido_id))];
    
    const { data: contenidos, error: contenidosError } = await supabaseAdmin
      .from('contenido')
      .select(`
        id,
        titulo,
        subtemas (
          id,
          temas (
            id,
            periodos (
              id,
              materias (
                id,
                nombre
              )
            )
          )
        )
      `)
      .in('id', contenidoIds);

    if (contenidosError) {
      console.error('Error al obtener contenidos:', contenidosError);
    }

    // Crear mapa de contenidos con información de materia
    const contenidosMap = new Map();
    
    if (contenidos && contenidos.length > 0) {
      contenidos.forEach((contenido: any) => {
        let materiaNombre = 'Materia desconocida';
        let titulo = contenido.titulo || 'Sin título';
        
        // Navegar por la estructura: subtemas -> temas -> periodos -> materias
        // La estructura puede venir como objeto único o array
        if (contenido.subtemas) {
          const subtema = Array.isArray(contenido.subtemas) ? contenido.subtemas[0] : contenido.subtemas;
          
          if (subtema && subtema.temas) {
            const tema = Array.isArray(subtema.temas) ? subtema.temas[0] : subtema.temas;
            
            if (tema && tema.periodos) {
              const periodo = Array.isArray(tema.periodos) ? tema.periodos[0] : tema.periodos;
              
              if (periodo && periodo.materias) {
                const materia = Array.isArray(periodo.materias) ? periodo.materias[0] : periodo.materias;
                
                if (materia && materia.nombre) {
                  materiaNombre = materia.nombre;
                }
              }
            }
          }
        }

        contenidosMap.set(contenido.id, {
          id: contenido.id,
          titulo: titulo,
          materia_nombre: materiaNombre,
        });
      });
    } else {
      console.error('No se encontraron contenidos para los IDs:', contenidoIds);
    }

    // Organizar preguntas con sus respuestas
    const preguntasConRespuestas = preguntas
      .map((pregunta: any) => {
        const respuestasDePregunta = (respuestas || []).filter(
          (r: any) => r.pregunta_id === pregunta.id
        );

        // Solo incluir preguntas que tienen respuestas
        if (respuestasDePregunta.length === 0) {
          return null;
        }

        const contenido = contenidosMap.get(pregunta.contenido_id);
        
        // Log para debug si no se encuentra el contenido
        if (!contenido) {
          console.error('No se encontró contenido para pregunta:', {
            pregunta_id: pregunta.id,
            contenido_id: pregunta.contenido_id,
            contenidoIds_disponibles: Array.from(contenidosMap.keys()),
          });
        }

        return {
          pregunta_id: pregunta.id,
          contenido_id: pregunta.contenido_id,
          contenido_titulo: contenido?.titulo || 'Sin título',
          materia_nombre: contenido?.materia_nombre || 'Materia desconocida',
          pregunta_texto: pregunta.texto,
          pregunta_fecha: pregunta.creado_at,
          respuestas: respuestasDePregunta.map((respuesta: any) => ({
            id: respuesta.id,
            texto: respuesta.texto,
            fecha: respuesta.creado_at,
            profesor_nombre: profesoresMap.get(respuesta.autor_id)?.nombre || 'Profesor',
          })),
          ultima_respuesta_fecha: respuestasDePregunta[respuestasDePregunta.length - 1].creado_at,
        };
      })
      .filter((item: any) => item !== null)
      .sort((a: any, b: any) => {
        const fechaA = new Date(a.ultima_respuesta_fecha).getTime();
        const fechaB = new Date(b.ultima_respuesta_fecha).getTime();
        return fechaB - fechaA;
      });

    return NextResponse.json({
      data: preguntasConRespuestas
    });
  } catch (error: any) {
    console.error('Error en get-respuestas-estudiante:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}

