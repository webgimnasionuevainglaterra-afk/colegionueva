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

// API para obtener preguntas pendientes de respuesta para el profesor
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

    // Verificar que es profesor
    const { data: profesor } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profesor) {
      return NextResponse.json(
        { error: 'Solo los profesores pueden ver preguntas pendientes' },
        { status: 403 }
      );
    }

    // Obtener cursos asignados al profesor
    const { data: cursosAsignados } = await supabaseAdmin
      .from('profesores_cursos')
      .select('curso_id')
      .eq('profesor_id', profesor.id);

    if (!cursosAsignados || cursosAsignados.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    const cursoIds = cursosAsignados.map((c: any) => c.curso_id);

    // Obtener materias de los cursos del profesor
    const { data: materias } = await supabaseAdmin
      .from('materias')
      .select('id, nombre, curso_id')
      .in('curso_id', cursoIds);

    if (!materias || materias.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    const materiaIds = materias.map((m: any) => m.id);

    // Obtener periodos de esas materias
    const { data: periodos } = await supabaseAdmin
      .from('periodos')
      .select('id, materia_id')
      .in('materia_id', materiaIds);

    if (!periodos || periodos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    const periodoIds = periodos.map((p: any) => p.id);

    // Obtener temas de esos periodos
    const { data: temas } = await supabaseAdmin
      .from('temas')
      .select('id, periodo_id')
      .in('periodo_id', periodoIds);

    if (!temas || temas.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    const temaIds = temas.map((t: any) => t.id);

    // Obtener subtemas de esos temas
    const { data: subtemas } = await supabaseAdmin
      .from('subtemas')
      .select('id, tema_id')
      .in('tema_id', temaIds);

    if (!subtemas || subtemas.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    const subtemaIds = subtemas.map((s: any) => s.id);

    // Obtener contenidos de esos subtemas
    const { data: contenidos } = await supabaseAdmin
      .from('contenido')
      .select('id, titulo, tipo, subtema_id')
      .in('subtema_id', subtemaIds);

    if (!contenidos || contenidos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    const contenidoIds = contenidos.map((c: any) => c.id);

    // Crear mapa de contenidos para enriquecer las preguntas
    const contenidosMap = new Map();
    contenidos.forEach((c: any) => {
      contenidosMap.set(c.id, c);
    });

    // Crear mapa de materias para obtener el nombre
    const materiasMap = new Map();
    materias.forEach((m: any) => {
      materiasMap.set(m.id, m);
    });

    if (contenidoIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    // Obtener preguntas sin respuesta de esos contenidos
    const { data: preguntas, error: preguntasError } = await supabaseAdmin
      .from('preguntas_respuestas')
      .select('*')
      .in('contenido_id', contenidoIds)
      .eq('tipo', 'pregunta')
      .eq('eliminado', false)
      .order('creado_at', { ascending: false });

    if (preguntasError) {
      console.error('Error al obtener preguntas:', preguntasError);
      return NextResponse.json(
        { error: 'Error al obtener preguntas' },
        { status: 500 }
      );
    }

    // Verificar cuáles tienen respuestas
    if (preguntas && preguntas.length > 0) {
      const preguntaIds = preguntas.map((p: any) => p.id);
      
      const { data: respuestas } = await supabaseAdmin
        .from('preguntas_respuestas')
        .select('pregunta_id')
        .in('pregunta_id', preguntaIds)
        .eq('eliminado', false);

      const preguntaIdsConRespuesta = new Set(respuestas?.map((r: any) => r.pregunta_id) || []);

      // Filtrar solo preguntas sin respuesta
      const preguntasSinRespuesta = preguntas.filter((p: any) => !preguntaIdsConRespuesta.has(p.id));

      // Obtener información de los autores (estudiantes)
      const autorIds = [...new Set(preguntasSinRespuesta.map((p: any) => p.autor_id))];
      
      const { data: estudiantes } = await supabaseAdmin
        .from('estudiantes')
        .select('user_id, nombre, apellido')
        .in('user_id', autorIds);

      // Crear mapa de autores
      const autoresMap = new Map();
      estudiantes?.forEach((e: any) => {
        autoresMap.set(e.user_id, {
          nombre: `${e.nombre || ''} ${e.apellido || ''}`.trim() || 'Estudiante',
        });
      });

      // Obtener información de materias para cada pregunta
      // Hacer consultas paso a paso para evitar problemas con relaciones anidadas
      const subtemaIdsDeContenidos = [...new Set(contenidos.map((c: any) => c.subtema_id))];
      
      // Obtener temas de los subtemas (ya los tenemos en la variable temas)
      // Solo necesitamos los periodos de esos temas

      // Crear mapa: subtema_id -> tema_id -> periodo_id -> materia_id
      const subtemaTemaMap = new Map();
      subtemas.forEach((s: any) => {
        const tema = temas.find((t: any) => t.id === s.tema_id);
        if (tema) {
          subtemaTemaMap.set(s.id, tema.id);
        }
      });

      const temaPeriodoMap = new Map();
      temas.forEach((t: any) => {
        const periodo = periodos.find((p: any) => p.id === t.periodo_id);
        if (periodo) {
          temaPeriodoMap.set(t.id, periodo.materia_id);
        }
      });

      // Crear mapa: contenido_id -> materia_id
      const contenidoMateriaMap = new Map();
      contenidos.forEach((c: any) => {
        const temaId = subtemaTemaMap.get(c.subtema_id);
        if (temaId) {
          const materiaId = temaPeriodoMap.get(temaId);
          if (materiaId) {
            contenidoMateriaMap.set(c.id, materiaId);
          }
        }
      });

      // Enriquecer preguntas con información del contenido y autor
      const preguntasEnriquecidas = preguntasSinRespuesta.map((pregunta: any) => {
        const contenido = contenidosMap.get(pregunta.contenido_id);
        const materiaId = contenidoMateriaMap.get(pregunta.contenido_id);
        const materia = materiaId ? materiasMap.get(materiaId) : null;
        
        return {
          ...pregunta,
          autor: autoresMap.get(pregunta.autor_id) || { nombre: 'Estudiante' },
          contenido: {
            id: contenido?.id || pregunta.contenido_id,
            titulo: contenido?.titulo || 'Contenido',
            tipo: contenido?.tipo || 'archivo',
          },
          materia: materia?.nombre || 'Materia desconocida',
        };
      });

      return NextResponse.json({
        success: true,
        data: preguntasEnriquecidas,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: [],
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-pendientes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

