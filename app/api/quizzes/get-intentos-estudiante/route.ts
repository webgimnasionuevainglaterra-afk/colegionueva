import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estudiante_id = searchParams.get('estudiante_id');
    const periodo_id = searchParams.get('periodo_id');

    if (!estudiante_id) {
      return NextResponse.json(
        { error: 'estudiante_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    let query = supabaseAdmin
      .from('intentos_quiz')
      .select(`
        *,
        quizzes (
          id,
          nombre,
          descripcion,
          subtema_id,
          subtemas (
            id,
            nombre,
            tema_id,
            temas (
              id,
              nombre,
              periodo_id
            )
          )
        )
      `)
      .eq('estudiante_id', estudiante_id)
      .eq('completado', true);

    // Si se especifica periodo_id, filtrar por periodo
    if (periodo_id) {
      // Esto requiere un join más complejo, por ahora obtenemos todos y filtramos
    }

    const { data: intentos, error } = await query.order('fecha_fin', { ascending: false });

    if (error) {
      console.error('Error al obtener intentos:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los intentos' },
        { status: 500 }
      );
    }

    // Filtrar por periodo si se especificó
    let intentosFiltrados = intentos || [];
    if (periodo_id) {
      intentosFiltrados = intentosFiltrados.filter((intento: any) => 
        intento.quizzes?.subtema?.tema?.periodo_id === periodo_id
      );
    }

    // Calcular promedio si hay intentos
    let promedio = 0;
    if (intentosFiltrados.length > 0) {
      const sumaCalificaciones = intentosFiltrados.reduce((sum: number, intento: any) => 
        sum + (parseFloat(intento.calificacion) || 0), 0
      );
      promedio = sumaCalificaciones / intentosFiltrados.length;
    }

    return NextResponse.json(
      { 
        data: intentosFiltrados,
        promedio: parseFloat(promedio.toFixed(2)),
        total_quizzes: intentosFiltrados.length
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-intentos-estudiante:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






