import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const { id, nombre, fecha_inicio, fecha_fin } = await request.json();

    if (!id || !nombre) {
      return NextResponse.json(
        { error: 'ID y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const updateData: any = {
      nombre: nombre.trim(),
    };

    if (fecha_inicio !== undefined) updateData.fecha_inicio = fecha_inicio || null;
    if (fecha_fin !== undefined) updateData.fecha_fin = fecha_fin || null;

    const { data, error } = await supabaseAdmin
      .from('periodos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar periodo:', error);
      return NextResponse.json(
        { error: error.message || 'Error al actualizar el periodo' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Periodo actualizado exitosamente', data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-period:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
















