import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course_id, video_url, descripcion } = body;

    if (!course_id || !video_url) {
      return NextResponse.json(
        { error: 'course_id y video_url son requeridos' },
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

    // Verificar que el profesor tenga asignado este curso
    const { data: cursoAsignado, error: cursoError } = await supabaseAdmin
      .from('profesores_cursos')
      .select('*')
      .eq('profesor_id', profesorId)
      .eq('curso_id', course_id)
      .single();

    if (cursoError || !cursoAsignado) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar este curso' },
        { status: 403 }
      );
    }

    // Verificar si ya existe un video para este curso y profesor
    const { data: videoExistente } = await supabaseAdmin
      .from('videos_cursos')
      .select('id')
      .eq('curso_id', course_id)
      .eq('profesor_id', profesorId)
      .single();

    let video;

    if (videoExistente) {
      // Actualizar el video existente
      const { data, error: updateError } = await supabaseAdmin
        .from('videos_cursos')
        .update({
          video_url,
          descripcion: descripcion || null,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', videoExistente.id)
        .select()
        .single();

      if (updateError) throw updateError;
      video = data;
    } else {
      // Crear un nuevo video
      const { data, error: insertError } = await supabaseAdmin
        .from('videos_cursos')
        .insert({
          curso_id: course_id,
          profesor_id: profesorId,
          video_url,
          descripcion: descripcion || null,
          creado_por: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      video = data;
    }

    return NextResponse.json({ data: video });
  } catch (error: any) {
    console.error('Error al guardar video del curso:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar el video del curso' },
      { status: 500 }
    );
  }
}

