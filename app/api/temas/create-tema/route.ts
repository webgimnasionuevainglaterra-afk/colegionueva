import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodo_id, nombre, descripcion, orden } = body;

    if (!periodo_id || !nombre) {
      return NextResponse.json(
        { error: 'periodo_id y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el máximo orden actual para este periodo
    const { data: existingTemas } = await supabaseAdmin
      .from('temas')
      .select('orden')
      .eq('periodo_id', periodo_id)
      .order('orden', { ascending: false })
      .limit(1);

    const nextOrden = orden !== undefined ? orden : ((existingTemas?.[0]?.orden ?? -1) + 1);

    const { data, error } = await supabaseAdmin
      .from('temas')
      .insert({
        periodo_id,
        nombre,
        descripcion: descripcion || null,
        orden: nextOrden,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear tema:', error);
      return NextResponse.json(
        { error: error.message || 'Error al crear el tema' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-tema:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






