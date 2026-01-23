import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener todas las evaluaciones
    const { data: evaluaciones, error: evaluacionesError } = await supabaseAdmin
      .from('evaluaciones_periodo')
      .select('*')
      .order('fecha_creacion', { ascending: false });

    if (evaluacionesError) {
      console.error('Error al obtener evaluaciones:', evaluacionesError);
      return NextResponse.json(
        { error: evaluacionesError.message || 'Error al obtener las evaluaciones' },
        { status: 500 }
      );
    }

    // Obtener información de periodos para cada evaluación
    const evaluacionesConPeriodos = await Promise.all(
      (evaluaciones || []).map(async (evaluacion: any) => {
        if (!evaluacion.periodo_id) {
          return { ...evaluacion, periodos: null };
        }

        const { data: periodo, error: periodoError } = await supabaseAdmin
          .from('periodos')
          .select(`
            id,
            nombre,
            numero_periodo,
            materia_id,
            materias:materia_id (
              id,
              nombre
            )
          `)
          .eq('id', evaluacion.periodo_id)
          .single();

        if (periodoError) {
          console.error('Error al obtener periodo:', periodoError);
          return { ...evaluacion, periodos: null };
        }

        return {
          ...evaluacion,
          periodos: periodo,
        };
      })
    );

    return NextResponse.json(
      { data: evaluacionesConPeriodos || [] },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-all-evaluaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

