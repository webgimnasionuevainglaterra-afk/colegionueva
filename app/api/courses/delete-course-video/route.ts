import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { course_id } = body;

    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id es requerido' },
        { status: 400 }
      );
    }

    // Obtener el token de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verificar el usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // El id del profesor es el mismo que el id del usuario en auth.users
    const profesorId = user.id;

    // Verificar que el usuario sea un profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', profesorId)
      .single();

    if (profesorError || !profesor) {
      return NextResponse.json(
        { error: 'No se encontró el profesor asociado' },
        { status: 403 }
      );
    }

    // Eliminar el video del curso
    const { error: deleteError } = await supabaseAdmin
      .from('videos_cursos')
      .delete()
      .eq('curso_id', course_id)
      .eq('profesor_id', profesorId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar video del curso:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar el video del curso' },
      { status: 500 }
    );
  }
}

