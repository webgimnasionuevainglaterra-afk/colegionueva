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

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, isOnline } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Verificar primero si existe en administrators
    const { data: adminData } = await supabaseAdmin
      .from('administrators')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (adminData) {
      // Actualizar en administrators
      const { error: adminError } = await supabaseAdmin
        .from('administrators')
        .update({ 
          is_online: isOnline,
          last_seen: isOnline ? new Date().toISOString() : null
        })
        .eq('id', userId);

      if (adminError) {
        console.error('Error al actualizar estado del administrador:', adminError);
        return NextResponse.json(
          { error: adminError.message || 'Error al actualizar el estado' },
          { status: 400 }
        );
      }
    } else {
      // Verificar si es profesor
      const { data: profesorData } = await supabaseAdmin
        .from('profesores')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (profesorData) {
        // Actualizar en profesores
        const { error: profesorError } = await supabaseAdmin
          .from('profesores')
          .update({ 
            is_online: isOnline,
            last_seen: isOnline ? new Date().toISOString() : null
          })
          .eq('id', userId);

        if (profesorError) {
          console.error('Error al actualizar estado del profesor:', profesorError);
          return NextResponse.json(
            { error: profesorError.message || 'Error al actualizar el estado' },
            { status: 400 }
          );
        }
      } else {
        // Buscar estudiante por user_id
        const { data: estudiante, error: estudianteFindError } = await supabaseAdmin
          .from('estudiantes')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (estudianteFindError || !estudiante) {
          return NextResponse.json(
            { error: 'Usuario no encontrado en ninguna tabla' },
            { status: 404 }
          );
        }

        // Actualizar en estudiantes
        const { error: estudianteError } = await supabaseAdmin
          .from('estudiantes')
          .update({ 
            is_online: isOnline,
            last_seen: isOnline ? new Date().toISOString() : null
          })
          .eq('id', estudiante.id);

        if (estudianteError) {
          console.error('Error al actualizar estado del estudiante:', estudianteError);
          return NextResponse.json(
            { error: estudianteError.message || 'Error al actualizar el estado' },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Estado actualizado exitosamente'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-user-status:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






