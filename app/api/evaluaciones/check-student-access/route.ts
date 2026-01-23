import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evaluacion_id, estudiante_id } = body;

    if (!evaluacion_id || !estudiante_id) {
      return NextResponse.json(
        { error: 'evaluacion_id y estudiante_id son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Verificar si existe un registro individual para este estudiante
    const { data: registroIndividual, error: registroError } = await supabaseAdmin
      .from('evaluaciones_estudiantes')
      .select('is_active')
      .eq('evaluacion_id', evaluacion_id)
      .eq('estudiante_id', estudiante_id)
      .single();

    // Si hay un registro individual, usar ese estado
    // Si no hay registro (error PGRST116), devolver null para usar el estado global
    if (registroError && registroError.code !== 'PGRST116') {
      console.error('Error al verificar acceso individual:', registroError);
      return NextResponse.json(
        { error: 'Error al verificar el acceso' },
        { status: 500 }
      );
    }

    const hasIndividualAccess = registroIndividual ? registroIndividual.is_active : null;

    return NextResponse.json({
      success: true,
      has_individual_access: hasIndividualAccess, // true, false, o null (null = usa estado global)
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en check-student-access:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}



