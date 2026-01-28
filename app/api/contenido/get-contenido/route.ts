import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subtema_id = searchParams.get('subtema_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('contenido')
      .select('*, subtemas(nombre, tema_id)')
      .order('orden', { ascending: true });

    if (subtema_id) {
      query = query.eq('subtema_id', subtema_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener contenido:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener el contenido' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: data || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-contenido:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









