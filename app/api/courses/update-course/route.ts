import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const { id, nombre, nivel } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID del curso es requerido' },
        { status: 400 }
      );
    }

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

    // Actualizar curso en la tabla
    const { data, error } = await supabaseAdmin
      .from('cursos')
      .update({
        nombre: nombre.trim(),
        nivel: nivel,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar curso:', error);
      return NextResponse.json(
        { error: error.message || 'Error al actualizar el curso' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Curso actualizado exitosamente', data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-course:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}











