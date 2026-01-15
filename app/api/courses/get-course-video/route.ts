import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    if (!courseId) {
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

    // Obtener el video del curso para este profesor
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos_cursos')
      .select('*')
      .eq('curso_id', courseId)
      .eq('profesor_id', profesorId)
      .single();

    if (videoError) {
      if (videoError.code === 'PGRST116') {
        // No se encontró el video
        return NextResponse.json({ data: null });
      }
      throw videoError;
    }

    return NextResponse.json({ data: video });
  } catch (error: any) {
    console.error('Error al obtener video del curso:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener el video del curso' },
      { status: 500 }
    );
  }
}

