import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { nombre, nivel } = await request.json();

    if (!nombre || !nivel) {
      return NextResponse.json(
        { error: 'El nombre y el nivel son requeridos' },
        { status: 400 }
      );
    }

    const nivelesValidos = ['Primaria', 'Bachillerato', 'Técnico', 'Profesional'];
    if (!nivelesValidos.includes(nivel)) {
      return NextResponse.json(
        { error: `El nivel debe ser uno de: ${nivelesValidos.join(', ')}` },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Insertar curso en la tabla
    const { data, error } = await supabaseAdmin
      .from('cursos')
      .insert([
        {
          nombre: nombre.trim(),
          nivel: nivel,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al crear curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al crear el curso' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Curso creado exitosamente', data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-course:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

