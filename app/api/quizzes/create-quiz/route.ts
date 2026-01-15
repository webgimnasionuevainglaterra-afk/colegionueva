import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface Pregunta {
  pregunta_texto: string;
  tiempo_segundos?: number;
  opciones: Array<{
    texto: string;
    es_correcta: boolean;
    explicacion?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      subtema_id, 
      nombre, 
      descripcion, 
      fecha_inicio,
      fecha_fin,
      is_active, // Si no se especifica, se calculará automáticamente
      preguntas 
    } = body;

    if (!subtema_id || !nombre || !preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
      return NextResponse.json(
        { error: 'subtema_id, nombre y preguntas son requeridos' },
        { status: 400 }
      );
    }

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'fecha_inicio y fecha_fin son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el usuario autenticado
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar si el usuario es un profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profesorError && profesor) {
      // Si es profesor, verificar que el subtema pertenece a un curso asignado
      const { data: subtemaData, error: subtemaError } = await supabaseAdmin
        .from('subtemas')
        .select(`
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
        `)
        .eq('id', subtema_id)
        .single();

      if (subtemaError || !subtemaData) {
        return NextResponse.json(
          { error: 'Subtema no encontrado' },
          { status: 404 }
        );
      }

      const cursoId = subtemaData.temas?.periodos?.materias?.curso_id;
      if (!cursoId) {
        return NextResponse.json(
          { error: 'No se pudo determinar el curso del subtema' },
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
          { error: 'No tienes permiso para crear quizzes en este curso' },
          { status: 403 }
        );
      }
    }

    // Validar que cada pregunta tenga al menos 2 opciones y una correcta
    for (const pregunta of preguntas) {
      if (!pregunta.pregunta_texto || !pregunta.opciones || pregunta.opciones.length < 2) {
        return NextResponse.json(
          { error: 'Cada pregunta debe tener al menos 2 opciones' },
          { status: 400 }
        );
      }
      const tieneCorrecta = pregunta.opciones.some((op: any) => op.es_correcta === true);
      if (!tieneCorrecta) {
        return NextResponse.json(
          { error: 'Cada pregunta debe tener al menos una opción correcta' },
          { status: 400 }
        );
      }
    }

    // Calcular is_active automáticamente si no se especifica manualmente
    // Se activa si la fecha actual está entre fecha_inicio y fecha_fin
    let isActiveValue: boolean;
    if (is_active !== undefined) {
      // Si el profesor especificó manualmente, usar ese valor
      isActiveValue = is_active;
    } else {
      // Calcular automáticamente basado en las fechas
      const ahora = new Date();
      const inicio = new Date(fecha_inicio);
      const fin = new Date(fecha_fin);
      isActiveValue = ahora >= inicio && ahora <= fin;
    }

    // Crear el quiz
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('quizzes')
      .insert({
        subtema_id,
        nombre,
        is_active: isActiveValue,
        descripcion: descripcion || null,
        tiempo_por_pregunta_segundos: 30, // Mantener por compatibilidad, pero ya no se usa
        fecha_inicio,
        fecha_fin,
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error al crear quiz:', quizError);
      return NextResponse.json(
        { error: quizError.message || 'Error al crear el quiz' },
        { status: 500 }
      );
    }

    // Crear preguntas y opciones
    for (let i = 0; i < preguntas.length; i++) {
      const preguntaData = preguntas[i];
      
      const { data: pregunta, error: preguntaError } = await supabaseAdmin
        .from('preguntas')
        .insert({
          quiz_id: quiz.id,
          pregunta_texto: preguntaData.pregunta_texto,
          tiempo_segundos: preguntaData.tiempo_segundos || 30,
          orden: i + 1,
        })
        .select()
        .single();

      if (preguntaError) {
        console.error('Error al crear pregunta:', preguntaError);
        // Eliminar el quiz si falla
        await supabaseAdmin.from('quizzes').delete().eq('id', quiz.id);
        return NextResponse.json(
          { error: preguntaError.message || 'Error al crear las preguntas' },
          { status: 500 }
        );
      }

      // Crear opciones de respuesta
      for (let j = 0; j < preguntaData.opciones.length; j++) {
        const opcion = preguntaData.opciones[j];
        const { error: opcionError } = await supabaseAdmin
          .from('opciones_respuesta')
          .insert({
            pregunta_id: pregunta.id,
            texto: opcion.texto,
            es_correcta: opcion.es_correcta,
            explicacion: opcion.explicacion || null,
            orden: j + 1,
          });

        if (opcionError) {
          console.error('Error al crear opción:', opcionError);
          // Eliminar el quiz y preguntas si falla
          await supabaseAdmin.from('preguntas').delete().eq('quiz_id', quiz.id);
          await supabaseAdmin.from('quizzes').delete().eq('id', quiz.id);
          return NextResponse.json(
            { error: opcionError.message || 'Error al crear las opciones' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      { data: quiz, message: 'Quiz creado exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-quiz:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

