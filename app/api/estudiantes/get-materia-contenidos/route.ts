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

    return NextResponse.json(
      { data: data || [] },
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


