import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Verificar autenticación y rol de administrador
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es administrador
    const { data: administrador, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError || !administrador) {
      return NextResponse.json(
        { error: 'No tienes permisos para actualizar matrículas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, estado, observaciones } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la matrícula es requerido' },
        { status: 400 }
      );
    }

    if (!estado) {
      return NextResponse.json(
        { error: 'El estado es requerido' },
        { status: 400 }
      );
    }

    // Validar que el estado sea válido
    const estadosValidos = ['pendiente', 'aprobada', 'rechazada', 'completada'];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Actualizar la matrícula
    const { data: matricula, error: updateError } = await supabaseAdmin
      .from('matriculas_presenciales')
      .update({
        estado,
        observaciones: observaciones || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar matrícula:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar la matrícula' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Matrícula actualizada exitosamente',
      matricula,
    });
  } catch (error: any) {
    console.error('Error en update matrícula:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}

