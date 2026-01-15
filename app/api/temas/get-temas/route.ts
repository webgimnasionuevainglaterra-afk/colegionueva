import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo_id = searchParams.get('periodo_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('temas')
      .select('*, periodos(nombre, numero_periodo)')
      .order('orden', { ascending: true });

    if (periodo_id) {
      query = query.eq('periodo_id', periodo_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener temas:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los temas' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: data || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-temas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}




