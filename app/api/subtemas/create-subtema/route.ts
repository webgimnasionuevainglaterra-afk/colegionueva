import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tema_id, nombre, descripcion, orden } = body;

    if (!tema_id || !nombre) {
      return NextResponse.json(
        { error: 'tema_id y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el máximo orden actual para este tema
    const { data: existingSubtemas } = await supabaseAdmin
      .from('subtemas')
      .select('orden')
      .eq('tema_id', tema_id)
      .order('orden', { ascending: false })
      .limit(1);

    const nextOrden = orden !== undefined ? orden : ((existingSubtemas?.[0]?.orden ?? -1) + 1);

    const { data, error } = await supabaseAdmin
      .from('subtemas')
      .insert({
        tema_id,
        nombre,
        descripcion: descripcion || null,
        orden: nextOrden,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear subtema:', error);
      return NextResponse.json(
        { error: error.message || 'Error al crear el subtema' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-subtema:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}







