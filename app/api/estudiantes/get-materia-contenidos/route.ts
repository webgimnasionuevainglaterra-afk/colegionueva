import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materia_id = searchParams.get('materia_id');

    if (!materia_id) {
      return NextResponse.json(
        { error: 'materia_id es requerido' },
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

    // Obtener el estudiante y su curso
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (estudianteError || !estudiante) {
      return NextResponse.json(
        { error: 'No se encontró información del estudiante' },
        { status: 403 }
      );
    }

    // Obtener el curso del estudiante
    const { data: estudianteCurso, error: cursoError } = await supabaseAdmin
      .from('estudiantes_cursos')
      .select('curso_id')
      .eq('estudiante_id', estudiante.id)
      .limit(1)
      .maybeSingle();

    if (cursoError || !estudianteCurso) {
      return NextResponse.json(
        { error: 'El estudiante no está inscrito en ningún curso' },
        { status: 403 }
      );
    }

    // Verificar que la materia pertenece al curso del estudiante
    const { data: materia, error: materiaError } = await supabaseAdmin
      .from('materias')
      .select('id, curso_id')
      .eq('id', materia_id)
      .eq('curso_id', estudianteCurso.curso_id)
      .maybeSingle();

    if (materiaError || !materia) {
      return NextResponse.json(
        { error: 'La materia no pertenece al curso del estudiante' },
        { status: 403 }
      );
    }

    // Obtener periodos de la materia SOLO del curso del estudiante, con sus temas, subtemas y contenido
    const { data, error } = await supabaseAdmin
      .from('periodos')
      .select(`
        id,
        nombre,
        numero_periodo,
        fecha_inicio,
        fecha_fin,
        temas (
          id,
          nombre,
          orden,
          subtemas (
            id,
            nombre,
            descripcion,
            orden,
            contenido (
              id,
              titulo,
              tipo,
              descripcion,
              url,
              archivo_url,
              orden
            )
          )
        )
      `)
      .eq('materia_id', materia_id)
      .order('numero_periodo', { ascending: true });

    if (error) {
      console.error('Error al obtener contenidos de la materia:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los contenidos de la materia' },
        { status: 500 }
      );
    }

    // Eliminar duplicados de contenido basándose en el ID
    const periodosSinDuplicados = (data || []).map((periodo: any) => {
      const temasSinDuplicados = (periodo.temas || []).map((tema: any) => {
        const subtemasSinDuplicados = (tema.subtemas || []).map((subtema: any) => {
          // Eliminar duplicados de contenido por ID
          const contenidoUnico = (subtema.contenido || []).reduce((acc: any[], contenido: any) => {
            // Evitar duplicados por ID o por mismo título y tipo
            if (
              !acc.find(
                (c: any) =>
                  c.id === contenido.id ||
                  (c.titulo === contenido.titulo && c.tipo === contenido.tipo)
              )
            ) {
              acc.push(contenido);
            }
            return acc;
          }, []);
          
          // Ordenar contenido por orden
          contenidoUnico.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
          
          return {
            ...subtema,
            contenido: contenidoUnico,
          };
        });
        
        // Ordenar subtemas por orden
        subtemasSinDuplicados.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
        
        return {
          ...tema,
          subtemas: subtemasSinDuplicados,
        };
      });
      
      // Ordenar temas por orden
      temasSinDuplicados.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
      
      return {
        ...periodo,
        temas: temasSinDuplicados,
      };
    });

    return NextResponse.json(
      { data: periodosSinDuplicados },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-materia-contenidos:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


