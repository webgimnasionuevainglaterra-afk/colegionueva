import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const { id, nombre, descripcion, horas_totales } = await request.json();

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

    // Actualizar materia en la tabla
    const updateData: any = {
      nombre: nombre.trim(),
    };

    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
    if (horas_totales !== undefined) updateData.horas_totales = horas_totales || 0;

    const { data, error } = await supabaseAdmin
      .from('materias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar materia:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una materia con ese nombre en este curso' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Error al actualizar la materia' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Materia actualizada exitosamente', data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-subject:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

