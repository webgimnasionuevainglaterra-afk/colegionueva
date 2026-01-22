import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tema_id = searchParams.get('tema_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('subtemas')
      .select('*, temas(nombre, periodo_id)')
      .order('orden', { ascending: true });

    if (tema_id) {
      query = query.eq('tema_id', tema_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener subtemas:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los subtemas' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: data || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-subtemas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





