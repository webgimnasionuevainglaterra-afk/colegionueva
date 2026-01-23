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
    const { contenido_id, contenido_texto, respuesta_a, es_pregunta } = body;

    if (!contenido_id || !contenido_texto) {
      return NextResponse.json(
        { error: 'contenido_id y contenido_texto son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el contenido existe y el usuario tiene acceso
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
      .eq('id', contenido_id)
      .maybeSingle();

    if (contenidoError) {
      console.error('Error al obtener contenido:', contenidoError);
      return NextResponse.json(
        { error: `Error al obtener contenido: ${contenidoError.message}` },
        { status: 500 }
      );
    }

    if (!contenido) {
      return NextResponse.json(
        { error: 'Contenido no encontrado' },
        { status: 404 }
      );
    }

    const cursoId = contenido.subtemas?.temas?.periodos?.materias?.curso_id;
    const materiaId = contenido.subtemas?.temas?.periodos?.materias?.id;

    if (!cursoId || !materiaId) {
      console.error('Error: No se pudo obtener cursoId o materiaId del contenido:', {
        contenido_id,
        estructura: JSON.stringify(contenido, null, 2),
        cursoId,
        materiaId,
        tiene_subtemas: !!contenido.subtemas,
        tiene_temas: !!contenido.subtemas?.temas,
        tiene_periodos: !!contenido.subtemas?.temas?.periodos,
        tiene_materias: !!contenido.subtemas?.temas?.periodos?.materias,
      });
      return NextResponse.json(
        { error: 'Error: No se pudo determinar el curso o materia del contenido. Verifique que el contenido esté correctamente relacionado con su materia y curso.' },
        { status: 500 }
      );
    }

    // Verificar si es estudiante
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let esEstudiante = false;
    if (estudiante && !estudianteError) {
      const { data: estudianteEnCurso, error: estudianteEnCursoError } = await supabaseAdmin
        .from('estudiantes_cursos')
        .select('id')
        .eq('estudiante_id', estudiante.id)
        .eq('curso_id', cursoId)
        .maybeSingle();

      if (estudianteEnCurso && !estudianteEnCursoError) {
        esEstudiante = true;
      }
    }

    // Verificar si es profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let esProfesor = false;
    if (profesor && !profesorError) {
      const { data: profesorEnCurso, error: profesorEnCursoError } = await supabaseAdmin
        .from('profesores_cursos')
        .select('id')
        .eq('profesor_id', profesor.id)
        .eq('curso_id', cursoId)
        .maybeSingle();

      if (profesorEnCurso && !profesorEnCursoError) {
        esProfesor = true;
      }
    }

    if (!esEstudiante && !esProfesor) {
      return NextResponse.json(
        { error: 'No tienes acceso a este contenido' },
        { status: 403 }
      );
    }

    // Validaciones de reglas de negocio
    if (esProfesor && es_pregunta) {
      return NextResponse.json(
        { error: 'Los profesores no pueden crear preguntas iniciales' },
        { status: 400 }
      );
    }

    if (esEstudiante && respuesta_a) {
      // Verificar que el mensaje al que responde existe y es del mismo contenido
      const { data: mensajePadre, error: mensajePadreError } = await supabaseAdmin
        .from('mensajes_foro')
        .select('id, contenido_id, es_pregunta')
        .eq('id', respuesta_a)
        .maybeSingle();

      if (mensajePadreError || !mensajePadre || mensajePadre.contenido_id !== contenido_id) {
        return NextResponse.json(
          { error: 'El mensaje al que intentas responder no existe' },
          { status: 400 }
        );
      }
    }

    // Crear el mensaje
    // NOTA: Si la tabla aún tiene tema_id en lugar de contenido_id, 
    // el código intentará usar tema_id como fallback
    const nuevoMensaje = {
      contenido_id, // Intentar usar contenido_id primero
      autor_id: user.id,
      contenido: contenido_texto,
      respuesta_a: respuesta_a || null,
      es_pregunta: es_pregunta || false,
      respondido: false,
      editado: false,
      eliminado: false,
    };

    let mensajeCreado;
    let insertError;

    // Intentar insertar con contenido_id
    const insertResult = await supabaseAdmin
      .from('mensajes_foro')
      .insert(nuevoMensaje)
      .select()
      .single();

    mensajeCreado = insertResult.data;
    insertError = insertResult.error;

    // Si falla y el error es por columna faltante, intentar con tema_id como fallback temporal
    if (insertError && (insertError.message?.includes('contenido_id') || insertError.message?.includes('column') || insertError.message?.includes('does not exist'))) {
      console.warn('⚠️ La columna contenido_id no existe, intentando con tema_id como fallback');
      
      // Obtener tema_id desde el contenido
      const temaId = contenido.subtemas?.temas?.id;
      
      if (temaId) {
        // Intentar con tema_id (estructura antigua)
        const mensajeConTemaId = {
          tema_id: temaId,
          autor_id: user.id,
          contenido: contenido_texto,
          respuesta_a: respuesta_a || null,
          es_pregunta: es_pregunta || false,
          respondido: false,
          editado: false,
          eliminado: false,
        };

        const fallbackResult = await supabaseAdmin
          .from('mensajes_foro')
          .insert(mensajeConTemaId)
          .select()
          .single();

        if (fallbackResult.error) {
          console.error('Error también con tema_id:', fallbackResult.error);
          return NextResponse.json(
            { error: 'Error: La tabla mensajes_foro necesita ser actualizada. Por favor, ejecute el script SQL ajustar_tablas_foro.sql en Supabase para agregar la columna contenido_id.' },
            { status: 500 }
          );
        }

        mensajeCreado = fallbackResult.data;
        insertError = null;
      } else {
        return NextResponse.json(
          { error: 'Error: La tabla mensajes_foro necesita ser actualizada. Por favor, ejecute el script SQL ajustar_tablas_foro.sql en Supabase para agregar la columna contenido_id.' },
          { status: 500 }
        );
      }
    }

    if (insertError) {
      console.error('Error al crear mensaje:', insertError);
      console.error('Datos que se intentaron insertar:', nuevoMensaje);
      
      return NextResponse.json(
        { error: `Error al crear el mensaje: ${insertError.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

    // Si es una pregunta de estudiante, crear notificación para el profesor
    if (esEstudiante && es_pregunta && mensajeCreado) {
      console.log('📧 Creando notificación para profesores del curso:', cursoId);
      
      // Intentar obtener profesor específico de la materia primero
      let profesoresParaNotificar: any[] = [];
      
      // Buscar profesores asignados específicamente a la materia
      const { data: profesoresMateria, error: profesoresMateriaError } = await supabaseAdmin
        .from('profesores_materias')
        .select('profesor_id, profesores!inner(user_id)')
        .eq('materia_id', materiaId);

      if (!profesoresMateriaError && profesoresMateria && profesoresMateria.length > 0) {
        console.log('✅ Profesores encontrados por materia:', profesoresMateria.length);
        profesoresParaNotificar = profesoresMateria.map((pm: any) => ({
          user_id: (pm.profesores as any).user_id,
        }));
      } else {
        // Si no hay profesores específicos de la materia, buscar por curso
        console.log('⚠️ No se encontraron profesores por materia, buscando por curso');
        const { data: profesoresCurso, error: profesoresError } = await supabaseAdmin
          .from('profesores_cursos')
          .select('profesor_id, profesores!inner(user_id)')
          .eq('curso_id', cursoId);

        if (!profesoresError && profesoresCurso && profesoresCurso.length > 0) {
          console.log('✅ Profesores encontrados por curso:', profesoresCurso.length);
          profesoresParaNotificar = profesoresCurso.map((pc: any) => ({
            user_id: (pc.profesores as any).user_id,
          }));
        } else {
          console.warn('⚠️ No se encontraron profesores para notificar');
        }
      }

      if (profesoresParaNotificar.length > 0) {
        // Crear notificaciones para todos los profesores encontrados
        const notificaciones = profesoresParaNotificar.map((prof: any) => ({
          usuario_id: prof.user_id,
          tipo: 'pregunta_sin_respuesta',
          titulo: 'Nueva pregunta en el foro',
          mensaje: `Un estudiante ha hecho una pregunta en el foro de "${contenido.subtemas?.temas?.periodos?.materias?.nombre || 'la materia'}"`,
          enlace: `/dashboard?contenido_id=${contenido_id}&mensaje_id=${mensajeCreado.id}`,
          leida: false,
          mensaje_foro_id: mensajeCreado.id,
          contenido_id: contenido_id,
          metadata: { materia_id: materiaId, curso_id: cursoId },
        }));

        const { error: insertNotifError } = await supabaseAdmin
          .from('notificaciones')
          .insert(notificaciones);

        if (insertNotifError) {
          console.error('❌ Error al insertar notificaciones:', insertNotifError);
        } else {
          console.log('✅ Notificaciones creadas exitosamente:', notificaciones.length);
        }
      }
    }

    // Si es una respuesta de profesor a una pregunta, marcar como respondido y notificar al estudiante
    if (esProfesor && respuesta_a) {
      const { data: mensajePadre, error: mensajePadreError } = await supabaseAdmin
        .from('mensajes_foro')
        .select('id, autor_id, es_pregunta')
        .eq('id', respuesta_a)
        .maybeSingle();

      if (!mensajePadreError && mensajePadre && mensajePadre.es_pregunta) {
        // Marcar pregunta como respondida
        await supabaseAdmin
          .from('mensajes_foro')
          .update({ respondido: true })
          .eq('id', respuesta_a);

        // Notificar al estudiante que hizo la pregunta
        await supabaseAdmin
          .from('notificaciones')
          .insert({
            usuario_id: mensajePadre.autor_id,
            tipo: 'respuesta_profesor',
            titulo: 'El profesor respondió tu pregunta',
            mensaje: `El profesor ha respondido a tu pregunta en el foro`,
            enlace: `/dashboard?contenido_id=${contenido_id}&mensaje_id=${mensajeCreado.id}`,
            leida: false,
            mensaje_foro_id: mensajeCreado.id,
            contenido_id: contenido_id,
            metadata: { materia_id: materiaId, curso_id: cursoId },
          });
      }
    }

    // Si es una respuesta de estudiante, notificar a otros participantes del hilo
    if (esEstudiante && respuesta_a) {
      const { data: participantes } = await supabaseAdmin
        .from('mensajes_foro')
        .select('autor_id')
        .eq('contenido_id', contenido_id)
        .or(`id.eq.${respuesta_a},respuesta_a.eq.${respuesta_a}`)
        .neq('autor_id', user.id);

      const participantesIds = [...new Set(participantes?.map((p: any) => p.autor_id) || [])];
      
      if (participantesIds.length > 0) {
        const notificaciones = participantesIds.map((participanteId: string) => ({
          usuario_id: participanteId,
          tipo: 'nueva_respuesta',
          titulo: 'Nueva respuesta en el foro',
          mensaje: `Hay una nueva respuesta en un hilo del foro`,
          enlace: `/dashboard?contenido_id=${contenido_id}&mensaje_id=${mensajeCreado.id}`,
          leida: false,
          mensaje_foro_id: mensajeCreado.id,
          contenido_id: contenido_id,
          metadata: { materia_id: materiaId, curso_id: cursoId },
        }));

        await supabaseAdmin
          .from('notificaciones')
          .insert(notificaciones);
      }
    }

    return NextResponse.json({
      success: true,
      data: mensajeCreado,
      message: 'Mensaje creado exitosamente',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error en create-mensaje:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

