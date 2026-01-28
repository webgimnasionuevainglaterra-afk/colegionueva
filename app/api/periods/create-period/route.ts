import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { materia_id, numero_periodo, nombre, fecha_inicio, fecha_fin } = await request.json();

    if (!materia_id || !numero_periodo || !nombre) {
      return NextResponse.json(
        { error: 'materia_id, numero_periodo y nombre son requeridos' },
        { status: 400 }
      );
    }

    if (![1, 2, 3, 4].includes(numero_periodo)) {
      return NextResponse.json(
        { error: 'numero_periodo debe ser 1, 2, 3 o 4' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('periodos')
      .insert([
        {
          materia_id,
          numero_periodo,
          nombre: nombre.trim(),
          fecha_inicio: fecha_inicio || null,
          fecha_fin: fecha_fin || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear periodo:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un periodo con ese número para esta materia' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Error al crear el periodo' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Periodo creado exitosamente', data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-period:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









