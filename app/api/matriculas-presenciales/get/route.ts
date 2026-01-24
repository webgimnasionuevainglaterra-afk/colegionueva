import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Verificar autenticación y rol de administrador
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es administrador
    const { data: administrador, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError || !administrador) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver las matrículas' },
        { status: 403 }
      );
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir consulta
    let query = supabaseAdmin
      .from('matriculas_presenciales')
      .select(`
        id,
        nombre_acudiente,
        nombre_estudiante,
        telefono_estudiante,
        estado,
        observaciones,
        creado_en,
        actualizado_en,
        cursos (
          id,
          nombre
        )
      `)
      .order('creado_en', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por estado si se proporciona
    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data: matriculas, error: matriculasError } = await query;

    if (matriculasError) {
      console.error('Error al obtener matrículas:', matriculasError);
      return NextResponse.json(
        { error: 'Error al obtener las matrículas' },
        { status: 500 }
      );
    }

    // Obtener conteo total
    let countQuery = supabaseAdmin
      .from('matriculas_presenciales')
      .select('id', { count: 'exact', head: true });

    if (estado) {
      countQuery = countQuery.eq('estado', estado);
    }

    const { count, error: countError } = await countQuery;

    return NextResponse.json({
      success: true,
      matriculas: matriculas || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error en get matrículas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}

