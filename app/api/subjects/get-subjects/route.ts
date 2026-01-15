import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const curso_id = searchParams.get('curso_id');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('materias')
      .select('*, cursos(nombre, nivel)')
      .order('nombre', { ascending: true });

    // Si se proporciona curso_id, filtrar por curso
    if (curso_id) {
      query = query.eq('curso_id', curso_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener materias:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener las materias' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: data || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-subjects:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}




