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

    // Obtener estadísticas generales
    const [cursosRes, estudiantesRes, profesoresRes, administradoresRes, materiasRes] = await Promise.all([
      // Total de cursos
      supabaseAdmin
        .from('cursos')
        .select('id', { count: 'exact', head: true }),
      // Total de estudiantes (con is_active)
      supabaseAdmin
        .from('estudiantes')
        .select('id, is_active'),
      // Total de profesores (con is_active)
      supabaseAdmin
        .from('profesores')
        .select('id, is_active'),
      // Total de administradores (todos los roles)
      supabaseAdmin
        .from('administrators')
        .select('id', { count: 'exact', head: true }),
      // Total de materias
      supabaseAdmin
        .from('materias')
        .select('id', { count: 'exact', head: true }),
    ]);

    const totalCursos = cursosRes.count || 0;
    const totalEstudiantes = estudiantesRes.data?.length || 0;
    const estudiantesActivos = estudiantesRes.data?.filter((e: any) => e.is_active === true).length || 0;
    const estudiantesInactivos = totalEstudiantes - estudiantesActivos;
    
    const totalProfesores = profesoresRes.data?.length || 0;
    const profesoresActivos = profesoresRes.data?.filter((p: any) => p.is_active === true).length || 0;
    const profesoresInactivos = totalProfesores - profesoresActivos;
    
    const totalAdministradores = administradoresRes.count || 0;
    const totalMaterias = materiasRes.count || 0;

    // Obtener totales de quizzes y evaluaciones directamente
    const [quizzesRes, evaluacionesRes] = await Promise.all([
      supabaseAdmin
        .from('quizzes')
        .select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('evaluaciones_periodo')
        .select('id', { count: 'exact', head: true }),
    ]);

    const totalQuizzes = quizzesRes.count || 0;
    const totalEvaluaciones = evaluacionesRes.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCursos,
        totalEstudiantes,
        estudiantesActivos,
        estudiantesInactivos,
        totalProfesores,
        profesoresActivos,
        profesoresInactivos,
        totalAdministradores,
        totalMaterias,
        totalQuizzes,
        totalEvaluaciones,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

