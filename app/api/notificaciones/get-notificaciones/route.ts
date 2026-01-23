import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
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

    // Obtener notificaciones del usuario, ordenadas por fecha (más recientes primero)
    const { data: notificaciones, error } = await supabaseAdmin
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50); // Limitar a las últimas 50 notificaciones

    if (error) {
      console.error('Error al obtener notificaciones:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener notificaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notificaciones || [],
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-notificaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



