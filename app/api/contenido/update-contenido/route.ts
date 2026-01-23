import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tipo, titulo, descripcion, url, archivo_url, orden } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    if (tipo && !['video', 'archivo', 'foro'].includes(tipo)) {
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

    const updateData: any = {};
    if (tipo !== undefined) updateData.tipo = tipo;
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (url !== undefined) updateData.url = url;
    if (archivo_url !== undefined) updateData.archivo_url = archivo_url;
    if (orden !== undefined) updateData.orden = orden;

    const { data, error } = await supabaseAdmin
      .from('contenido')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar contenido:', error);
      return NextResponse.json(
        { error: error.message || 'Error al actualizar el contenido' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-contenido:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






