import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
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
    const { notificacion_id } = body;

    if (!notificacion_id) {
      return NextResponse.json(
        { error: 'notificacion_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la notificación pertenece al usuario
    const { data: notificacion, error: checkError } = await supabaseAdmin
      .from('notificaciones')
      .select('id, usuario_id')
      .eq('id', notificacion_id)
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (checkError || !notificacion) {
      return NextResponse.json(
        { error: 'Notificación no encontrada o no autorizado' },
        { status: 404 }
      );
    }

    // Marcar como leída
    const { error: updateError } = await supabaseAdmin
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', notificacion_id);

    if (updateError) {
      console.error('Error al marcar notificación como leída:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al actualizar notificación' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída',
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en marcar-leida:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


