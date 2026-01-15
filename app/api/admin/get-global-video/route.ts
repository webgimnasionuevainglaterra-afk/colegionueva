import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
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

    // El video institucional es público para todos los usuarios autenticados
    // No necesitamos verificar el rol, cualquier usuario autenticado puede verlo

    // Obtener el video global (solo puede haber uno)
    const { data: video, error: videoError } = await supabaseAdmin
      .from('video_global')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (videoError) {
      // Si no se encontró el video (código PGRST116), devolver null sin error
      if (videoError.code === 'PGRST116' || videoError.message?.includes('No rows found')) {
        return NextResponse.json({ data: null }, { status: 200 });
      }
      throw videoError;
    }

    // Si no hay video, devolver null pero con status 200
    if (!video) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json({ data: video }, { status: 200 });
  } catch (error: any) {
    console.error('Error al obtener video global:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener el video institucional' },
      { status: 500 }
    );
  }
}

