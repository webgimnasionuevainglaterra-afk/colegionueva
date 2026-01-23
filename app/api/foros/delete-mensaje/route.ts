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

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const mensajeId = searchParams.get('mensaje_id');

    if (!mensajeId) {
      return NextResponse.json(
        { error: 'mensaje_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener el mensaje existente
    const { data: mensaje, error: mensajeError } = await supabaseAdmin
      .from('mensajes_foro')
      .select('id, autor_id, eliminado')
      .eq('id', mensajeId)
      .single();

    if (mensajeError || !mensaje) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      );
    }

    if (mensaje.eliminado) {
      return NextResponse.json(
        { error: 'El mensaje ya fue eliminado' },
        { status: 400 }
      );
    }

    // Verificar que el usuario es el autor del mensaje
    if (mensaje.autor_id !== user.id) {
      return NextResponse.json(
        { error: 'Solo puedes eliminar tus propios mensajes' },
        { status: 403 }
      );
    }

    // Soft delete: marcar como eliminado
    const { error: deleteError } = await supabaseAdmin
      .from('mensajes_foro')
      .update({
        eliminado: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mensajeId);

    if (deleteError) {
      console.error('Error al eliminar mensaje:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el mensaje' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mensaje eliminado exitosamente',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en delete-mensaje:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


