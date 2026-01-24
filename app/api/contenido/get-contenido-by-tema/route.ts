import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tema_id = searchParams.get('tema_id');

    if (!tema_id) {
      return NextResponse.json(
        { error: 'tema_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener los subtemas del tema y su contenido
    const { data: subtemas, error: subtemasError } = await supabaseAdmin
      .from('subtemas')
      .select(`
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
      `)
      .eq('tema_id', tema_id)
      .order('orden', { ascending: true });

    if (subtemasError) {
      console.error('Error al obtener subtemas:', subtemasError);
      return NextResponse.json(
        { error: subtemasError.message || 'Error al obtener los subtemas' },
        { status: 500 }
      );
    }

    // Obtener información del tema y su periodo/materia
    const { data: tema, error: temaError } = await supabaseAdmin
      .from('temas')
      .select(`
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
      `)
      .eq('id', tema_id)
      .single();

    if (temaError) {
      console.error('Error al obtener tema:', temaError);
      return NextResponse.json(
        { error: temaError.message || 'Error al obtener el tema' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        tema: {
          ...tema,
          subtemas: subtemas || []
        }
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error en get-contenido-by-tema:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

