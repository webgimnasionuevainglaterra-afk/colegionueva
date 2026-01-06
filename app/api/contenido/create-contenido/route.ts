import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtema_id, tipo, titulo, descripcion, url, archivo_url, orden } = body;

    if (!subtema_id || !tipo || !titulo) {
      return NextResponse.json(
        { error: 'subtema_id, tipo y titulo son requeridos' },
        { status: 400 }
      );
    }

    if (!['video', 'archivo', 'foro'].includes(tipo)) {
      return NextResponse.json(
        { error: 'tipo debe ser: video, archivo o foro' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el máximo orden actual para este subtema
    const { data: existingContenido } = await supabaseAdmin
      .from('contenido')
      .select('orden')
      .eq('subtema_id', subtema_id)
      .order('orden', { ascending: false })
      .limit(1);

    const nextOrden = orden !== undefined ? orden : ((existingContenido?.[0]?.orden ?? -1) + 1);

    console.log('🔵 API create-contenido recibió:', {
      subtema_id,
      tipo,
      titulo,
      url,
      archivo_url,
      archivo_url_type: typeof archivo_url
    });

    const { data, error } = await supabaseAdmin
      .from('contenido')
      .insert({
        subtema_id,
        tipo,
        titulo,
        descripcion: descripcion || null,
        url: url || null,
        archivo_url: archivo_url || null,
        orden: nextOrden,
      })
      .select()
      .single();

    console.log('🔵 API create-contenido insertó:', {
      data,
      error: error?.message
    });

    if (error) {
      console.error('Error al crear contenido:', error);
      return NextResponse.json(
        { error: error.message || 'Error al crear el contenido' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-contenido:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

