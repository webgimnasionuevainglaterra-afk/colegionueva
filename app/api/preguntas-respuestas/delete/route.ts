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

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
    }

    const body = await request.json();
    const { pregunta_id } = body;

    if (!pregunta_id) {
      return NextResponse.json(
        { error: 'pregunta_id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la pregunta existe y pertenece al usuario
    const { data: pregunta, error: preguntaError } = await supabaseAdmin
      .from('preguntas_respuestas')
      .select('id, autor_id, tipo')
      .eq('id', pregunta_id)
      .eq('tipo', 'pregunta')
      .maybeSingle();

    if (preguntaError || !pregunta) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el autor de la pregunta
    if (pregunta.autor_id !== user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta pregunta' },
        { status: 403 }
      );
    }

    // Soft delete: marcar como eliminado
    const { error: deleteError } = await supabaseAdmin
      .from('preguntas_respuestas')
      .update({ eliminado: true })
      .eq('id', pregunta_id);

    if (deleteError) {
      console.error('Error al eliminar pregunta:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar la pregunta' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pregunta eliminada correctamente'
    });
  } catch (error: any) {
    console.error('Error en delete pregunta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}

