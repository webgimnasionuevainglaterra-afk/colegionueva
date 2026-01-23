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

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
    }

    const body = await request.json();
    const { mensaje_id, contenido_texto } = body;

    if (!mensaje_id || !contenido_texto) {
      return NextResponse.json(
        { error: 'mensaje_id y contenido_texto son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el mensaje existente
    const { data: mensaje, error: mensajeError } = await supabaseAdmin
      .from('mensajes_foro')
      .select('id, autor_id, contenido_id, eliminado')
      .eq('id', mensaje_id)
      .single();

    if (mensajeError || !mensaje) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    if (mensaje.eliminado) {
      return NextResponse.json(
        { error: 'No se puede editar un mensaje eliminado' },
        { status: 400 }
      );
    }

    // Verificar que el usuario es el autor del mensaje
    if (mensaje.autor_id !== user.id) {
      return NextResponse.json(
        { error: 'Solo puedes editar tus propios mensajes' },
        { status: 403 }
      );
    }

    // Actualizar el mensaje
    const { data: mensajeActualizado, error: updateError } = await supabaseAdmin
      .from('mensajes_foro')
      .update({
        contenido: contenido_texto,
        editado: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mensaje_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar mensaje:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el mensaje' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mensajeActualizado,
      message: 'Mensaje actualizado exitosamente',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en update-mensaje:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


