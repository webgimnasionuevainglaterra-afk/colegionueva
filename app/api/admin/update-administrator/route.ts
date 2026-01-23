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

export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, nombre, apellido, email, foto_url, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del administrador es requerido' },
        { status: 400 }
      );
    }

    // Actualizar datos en la tabla administrators
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (apellido !== undefined) updateData.apellido = apellido;
    if (email !== undefined) updateData.email = email;
    if (foto_url !== undefined) updateData.foto_url = foto_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error: updateError } = await supabaseAdmin
      .from('administrators')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar administrador:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al actualizar el administrador' },
        { status: 400 }
      );
    }

    // Si se cambió el email, actualizar también en auth.users
    if (email !== undefined && data.email !== email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { email }
      );

      if (authError) {
        console.warn('Error al actualizar email en Auth:', authError);
        // No fallar si solo falla la actualización del email
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Administrador actualizado exitosamente',
        data
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-administrator:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}







