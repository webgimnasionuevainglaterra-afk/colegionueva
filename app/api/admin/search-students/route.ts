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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';

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
        { error: 'No tienes permiso para acceder a esta función' },
        { status: 403 }
      );
    }

    // Buscar estudiantes
    let estudiantes: any[] = [];
    let estudiantesError: any = null;

    if (query && query.trim() !== '') {
      // Si hay query, filtrar por nombre, apellido o tarjeta de identidad usando múltiples queries y combinando
      const searchTerm = query.trim();
      const { data: data1, error: error1 } = await supabaseAdmin
        .from('estudiantes')
        .select('id, nombre, apellido, foto_url, tarjeta_identidad, is_active')
        .ilike('nombre', `%${searchTerm}%`)
        .order('nombre', { ascending: true })
        .limit(100);
      
      const { data: data2, error: error2 } = await supabaseAdmin
        .from('estudiantes')
        .select('id, nombre, apellido, foto_url, tarjeta_identidad, is_active')
        .ilike('apellido', `%${searchTerm}%`)
        .order('nombre', { ascending: true })
        .limit(100);
      
      const { data: data3, error: error3 } = await supabaseAdmin
        .from('estudiantes')
        .select('id, nombre, apellido, foto_url, tarjeta_identidad, is_active')
        .ilike('tarjeta_identidad', `%${searchTerm}%`)
        .order('nombre', { ascending: true })
        .limit(100);
      
      if (error1 || error2 || error3) {
        estudiantesError = error1 || error2 || error3;
      } else {
        // Combinar resultados únicos
        const allIds = new Set();
        const combined: any[] = [];
        [...(data1 || []), ...(data2 || []), ...(data3 || [])].forEach((e: any) => {
          if (!allIds.has(e.id)) {
            allIds.add(e.id);
            combined.push(e);
          }
        });
        estudiantes = combined.slice(0, 100);
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('estudiantes')
        .select('id, nombre, apellido, foto_url, tarjeta_identidad, is_active')
        .order('nombre', { ascending: true })
        .limit(100);
      estudiantes = data || [];
      estudiantesError = error;
    }

    if (estudiantesError) {
      throw estudiantesError;
    }

    // Obtener cursos asignados para cada estudiante
    const estudiantesConCursos = await Promise.all(
      (estudiantes || []).map(async (estudiante) => {
        const { data: cursosAsignados } = await supabaseAdmin
          .from('estudiantes_cursos')
          .select(`
            curso_id,
            cursos:curso_id (
              id,
              nombre,
              nivel
            )
          `)
          .eq('estudiante_id', estudiante.id);

        return {
          ...estudiante,
          cursos: cursosAsignados?.map((ec: any) => ec.cursos).filter(Boolean) || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: estudiantesConCursos,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al buscar estudiantes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

