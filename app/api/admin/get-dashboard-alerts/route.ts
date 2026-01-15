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

    // 1. Cursos sin profesores asignados
    const { data: todosCursos, error: cursosError } = await supabaseAdmin
      .from('cursos')
      .select('id, nombre, nivel');

    const { data: cursosConProfesores, error: cursosProfError } = await supabaseAdmin
      .from('profesores_cursos')
      .select('curso_id');

    if (cursosError) {
      throw cursosError;
    }

    const cursosConProfesoresIds = new Set(
      cursosConProfesores?.map((cp: any) => cp.curso_id) || []
    );

    const cursosSinProfesores = (todosCursos || []).filter(
      (curso: any) => !cursosConProfesoresIds.has(curso.id)
    );

    // 2. Estudiantes sin cursos asignados
    const { data: todosEstudiantes, error: estudiantesError } = await supabaseAdmin
      .from('estudiantes')
      .select('id, nombre, apellido');

    const { data: estudiantesConCursos, error: estudiantesCursosError } = await supabaseAdmin
      .from('estudiantes_cursos')
      .select('estudiante_id');

    if (estudiantesError) {
      throw estudiantesError;
    }

    const estudiantesConCursosIds = new Set(
      estudiantesConCursos?.map((ec: any) => ec.estudiante_id) || []
    );

    const estudiantesSinCursos = (todosEstudiantes || []).filter(
      (estudiante: any) => !estudiantesConCursosIds.has(estudiante.id)
    );

    // 3. Profesores sin cursos asignados
    const { data: todosProfesores, error: profesoresError } = await supabaseAdmin
      .from('profesores')
      .select('id, nombre, apellido');

    if (profesoresError) {
      throw profesoresError;
    }

    // Obtener profesores que están en profesores_cursos
    const { data: profesoresCursosData, error: profesoresCursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select('profesor_id');

    if (profesoresCursosError) {
      throw profesoresCursosError;
    }

    const profesoresConCursosIds = new Set(
      profesoresCursosData?.map((pc: any) => pc.profesor_id) || []
    );

    const profesoresSinCursos = (todosProfesores || []).filter(
      (profesor: any) => !profesoresConCursosIds.has(profesor.id)
    );

    return NextResponse.json({
      success: true,
      data: {
        cursosSinProfesores: cursosSinProfesores.slice(0, 10), // Limitar a 10
        estudiantesSinCursos: estudiantesSinCursos.slice(0, 10), // Limitar a 10
        profesoresSinCursos: profesoresSinCursos.slice(0, 10), // Limitar a 10
        totalCursosSinProfesores: cursosSinProfesores.length,
        totalEstudiantesSinCursos: estudiantesSinCursos.length,
        totalProfesoresSinCursos: profesoresSinCursos.length,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener alertas del dashboard:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

