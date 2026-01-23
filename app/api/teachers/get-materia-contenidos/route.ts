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
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profesorError || !profesor) {
      return NextResponse.json(
        { error: 'No se encontró información del profesor' },
        { status: 403 }
      );
    }

    // Obtener la materia y su curso
    const { data: materia, error: materiaError } = await supabaseAdmin
      .from('materias')
      .select('id, nombre, curso_id')
      .eq('id', materia_id)
      .maybeSingle();

    if (materiaError || !materia) {
      return NextResponse.json(
        { error: 'Materia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el profesor está asignado al curso de la materia
    const { data: profesorCurso, error: cursoError } = await supabaseAdmin
      .from('profesores_cursos')
      .select('id')
      .eq('profesor_id', profesor.id)
      .eq('curso_id', materia.curso_id)
      .maybeSingle();

    if (cursoError || !profesorCurso) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta materia' },
        { status: 403 }
      );
    }

    // Obtener periodos de la materia con sus temas, subtemas y contenido
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

    // Procesar y limpiar datos (similar a la API de estudiantes)
    const periodosProcesados = (data || []).map((periodo: any) => {
      const temasUnicos = new Map();
      
      (periodo.temas || []).forEach((tema: any) => {
        if (!temasUnicos.has(tema.id)) {
          const subtemasUnicos = new Map();
          
          (tema.subtemas || []).forEach((subtema: any) => {
            if (!subtemasUnicos.has(subtema.id)) {
              const contenidoUnico = new Map();
              
              (subtema.contenido || []).forEach((cont: any) => {
                if (!contenidoUnico.has(cont.id)) {
                  contenidoUnico.set(cont.id, cont);
                }
              });
              
              subtemasUnicos.set(subtema.id, {
                ...subtema,
                contenido: Array.from(contenidoUnico.values()).sort((a: any, b: any) => 
                  (a.orden || 0) - (b.orden || 0)
                ),
              });
            }
          });
          
          temasUnicos.set(tema.id, {
            ...tema,
            subtemas: Array.from(subtemasUnicos.values()).sort((a: any, b: any) => 
              (a.orden || 0) - (b.orden || 0)
            ),
          });
        }
      });
      
      return {
        ...periodo,
        temas: Array.from(temasUnicos.values()).sort((a: any, b: any) => 
          (a.orden || 0) - (b.orden || 0)
        ),
      };
    });

    return NextResponse.json({
      success: true,
      data: periodosProcesados,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-materia-contenidos (profesor):', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


