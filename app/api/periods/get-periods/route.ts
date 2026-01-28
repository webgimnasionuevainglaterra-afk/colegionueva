import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materia_id = searchParams.get('materia_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('periodos')
      .select('*, materias(nombre, horas_totales)')
      .order('numero_periodo', { ascending: true });

    if (materia_id) {
      query = query.eq('materia_id', materia_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener periodos:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los periodos' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: data || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-periods:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









