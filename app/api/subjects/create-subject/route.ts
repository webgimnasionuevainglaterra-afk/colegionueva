import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { curso_id, nombre, descripcion, horas_totales } = await request.json();

    if (!curso_id || !nombre) {
      return NextResponse.json(
        { error: 'El curso_id y el nombre son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Insertar materia en la tabla
    const { data, error } = await supabaseAdmin
      .from('materias')
      .insert([
        {
          curso_id: curso_id,
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          horas_totales: horas_totales || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear materia:', error);
      // Si es error de duplicado
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe una materia con ese nombre en este curso' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Error al crear la materia' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Materia creada exitosamente', data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-subject:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

