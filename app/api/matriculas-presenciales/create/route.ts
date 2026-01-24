import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { nombre_acudiente, nombre_estudiante, curso_id, telefono_estudiante } = body;

    // Validaciones
    if (!nombre_acudiente || !nombre_acudiente.trim()) {
      return NextResponse.json(
        { error: 'El nombre del acudiente es requerido' },
        { status: 400 }
      );
    }

    if (!nombre_estudiante || !nombre_estudiante.trim()) {
      return NextResponse.json(
        { error: 'El nombre del estudiante es requerido' },
        { status: 400 }
      );
    }

    if (!curso_id) {
      return NextResponse.json(
        { error: 'El curso es requerido' },
        { status: 400 }
      );
    }

    if (!telefono_estudiante || !telefono_estudiante.trim()) {
      return NextResponse.json(
        { error: 'El teléfono del estudiante es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el curso existe
    const { data: curso, error: cursoError } = await supabaseAdmin
      .from('cursos')
      .select('id, nombre')
      .eq('id', curso_id)
      .single();

    if (cursoError || !curso) {
      return NextResponse.json(
        { error: 'El curso seleccionado no existe' },
        { status: 400 }
      );
    }

    // Crear la matrícula
    const { data: matricula, error: insertError } = await supabaseAdmin
      .from('matriculas_presenciales')
      .insert({
        nombre_acudiente: nombre_acudiente.trim(),
        nombre_estudiante: nombre_estudiante.trim(),
        curso_id: curso_id,
        telefono_estudiante: telefono_estudiante.trim(),
        estado: 'pendiente',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al crear matrícula:', insertError);
      return NextResponse.json(
        { error: 'Error al guardar la matrícula. Por favor, intenta más tarde.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Matrícula enviada exitosamente',
      matricula,
    });
  } catch (error: any) {
    console.error('Error en create matrícula:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}

