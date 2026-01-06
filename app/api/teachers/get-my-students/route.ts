import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
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

    // Obtener el ID del profesor desde el header de autorización
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar el token y obtener el usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es un profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profesorError || !profesor) {
      return NextResponse.json(
        { error: 'No eres un profesor autorizado' },
        { status: 403 }
      );
    }

    // Obtener los cursos asignados al profesor
    const { data: cursosAsignados, error: cursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select('curso_id')
      .eq('profesor_id', user.id);

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    const cursoIds = cursosAsignados?.map((pc: any) => pc.curso_id) || [];

    if (cursoIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    // Obtener los estudiantes de esos cursos
    const { data: estudiantesCursos, error: estudiantesError } = await supabaseAdmin
      .from('estudiantes_cursos')
      .select(`
        estudiante_id,
        curso_id,
        estudiantes (
          id,
          nombre,
          apellido,
          edad,
          correo_electronico,
          numero_telefono,
          tarjeta_identidad,
          sexo,
          foto_url,
          is_active,
          acudientes (
            id,
            nombre,
            apellido,
            correo_electronico,
            numero_telefono
          )
        ),
        cursos (
          id,
          nombre,
          nivel
        )
      `)
      .in('curso_id', cursoIds);

    if (estudiantesError) {
      console.error('Error al obtener estudiantes:', estudiantesError);
      return NextResponse.json(
        { error: estudiantesError.message || 'Error al obtener los estudiantes' },
        { status: 500 }
      );
    }

    // Formatear los datos
    const estudiantesFormateados = estudiantesCursos?.map((ec: any) => ({
      estudiante: {
        id: ec.estudiantes.id,
        nombre: ec.estudiantes.nombre,
        apellido: ec.estudiantes.apellido,
        edad: ec.estudiantes.edad,
        correo_electronico: ec.estudiantes.correo_electronico,
        numero_telefono: ec.estudiantes.numero_telefono,
        tarjeta_identidad: ec.estudiantes.tarjeta_identidad,
        sexo: ec.estudiantes.sexo,
        foto_url: ec.estudiantes.foto_url,
        is_active: ec.estudiantes.is_active,
        acudiente: ec.estudiantes.acudientes || null,
      },
      curso: {
        id: ec.cursos.id,
        nombre: ec.cursos.nombre,
        nivel: ec.cursos.nivel,
      },
    })) || [];

    return NextResponse.json({
      success: true,
      data: estudiantesFormateados,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-my-students:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

