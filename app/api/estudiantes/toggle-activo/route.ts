import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function PUT(request: NextRequest) {
  try {
    const { estudiante_id, is_active } = await request.json();

    if (!estudiante_id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'estudiante_id e is_active son requeridos' },
        { status: 400 }
      );
    }

    // Actualizar el estado del estudiante
    const { data, error } = await supabaseAdmin
      .from('estudiantes')
      .update({ is_active })
      .eq('id', estudiante_id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar estado del estudiante:', error);
      return NextResponse.json(
        { error: error.message || 'Error al actualizar el estado del estudiante' },
        { status: 500 }
      );
    }

    // Si se desactiva el estudiante, también desactivar su usuario en auth
    if (!is_active && data.user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user_id,
        { ban_duration: '876000h' } // Banear por ~100 años (efectivamente desactivar)
      );

      if (authError) {
        console.warn('Error al desactivar usuario en auth (no crítico):', authError);
        // No retornamos error aquí porque el estudiante ya fue actualizado
      }
    } else if (is_active && data.user_id) {
      // Si se reactiva, quitar el ban
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user_id,
        { ban_duration: '0' } // Quitar ban
      );

      if (authError) {
        console.warn('Error al reactivar usuario en auth (no crítico):', authError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      estudiante: data,
      message: is_active ? 'Estudiante activado correctamente' : 'Estudiante desactivado correctamente'
    });
  } catch (error: any) {
    console.error('Error en toggle-activo:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






