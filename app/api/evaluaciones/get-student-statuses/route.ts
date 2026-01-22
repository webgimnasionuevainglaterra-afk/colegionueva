import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluacion_id, estudiante_ids } = body;

    if (!evaluacion_id || !Array.isArray(estudiante_ids)) {
      return NextResponse.json(
        { error: 'evaluacion_id y estudiante_ids (array) son requeridos' },
        { status: 400 }
      );
    }

    // Si el array está vacío, retornar array vacío
    if (estudiante_ids.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el usuario autenticado
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es un profesor
    const { data: profesor } = await supabaseAdmin
      .from('profesores')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profesor) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener estados individuales de los estudiantes con esta evaluación
    const { data: estados, error: estadosError } = await supabaseAdmin
      .from('evaluaciones_estudiantes')
      .select('estudiante_id, is_active')
      .eq('evaluacion_id', evaluacion_id)
      .in('estudiante_id', estudiante_ids);

    if (estadosError) {
      console.error('Error al obtener estados:', estadosError);
      
      // Verificar si el error es porque la tabla no existe
      const errorMessage = estadosError.message || '';
      if (errorMessage.includes("Could not find the table") || errorMessage.includes("does not exist")) {
        // Si la tabla no existe, retornar array vacío en lugar de error
        // Esto permite que el modal se muestre, solo sin estados individuales
        return NextResponse.json({
          success: true,
          data: [],
          warning: 'La tabla evaluaciones_estudiantes no existe. Los estudiantes mostrarán estado global.',
        }, { status: 200 });
      }
      
      return NextResponse.json(
        { error: estadosError.message || 'Error al obtener los estados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estados || [],
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-student-statuses:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

