import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { video_url, descripcion } = body;

    if (!video_url) {
      return NextResponse.json(
        { error: 'video_url es requerido' },
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

    // Verificar que sea super administrador
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('role')
      .eq('id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'No tienes permiso para realizar esta acción' },
        { status: 403 }
      );
    }

    // Verificar si ya existe un video global
    const { data: videoExistente } = await supabaseAdmin
      .from('video_global')
      .select('id')
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    let video;

    if (videoExistente) {
      // Actualizar el video existente
      const { data, error: updateError } = await supabaseAdmin
        .from('video_global')
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
        .from('video_global')
        .insert({
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
    console.error('Error al guardar video global:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar el video institucional' },
      { status: 500 }
    );
  }
}




