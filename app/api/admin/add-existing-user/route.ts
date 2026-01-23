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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // 1. Buscar el usuario en auth.users por email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      return NextResponse.json(
        { error: listError.message || 'Error al buscar usuarios' },
        { status: 400 }
      );
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado con ese email' },
        { status: 404 }
      );
    }

    // 2. Verificar si ya existe en la tabla administrators
    const { data: existingAdmin } = await supabaseAdmin
      .from('administrators')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingAdmin) {
      return NextResponse.json(
        { 
          success: true,
          message: 'El usuario ya existe en la tabla de administradores',
          data: existingAdmin
        },
        { status: 200 }
      );
    }

    // 3. Insertar en la tabla administrators
    const nombre = user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario';
    const apellido = user.user_metadata?.apellido || '';
    
    // Determinar el rol
    let role = 'administrator';
    if (user.id === 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42') {
      role = 'super_admin';
    }

    const { data: newAdmin, error: insertError } = await supabaseAdmin
      .from('administrators')
      .insert({
        id: user.id,
        email: user.email || email,
        password_hash: '', // No guardamos el hash
        nombre: nombre,
        apellido: apellido,
        foto_url: null,
        role: role,
        created_by: null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al insertar en tabla administrators:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Error al agregar el usuario a la tabla' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Usuario agregado exitosamente a la tabla de administradores',
        data: newAdmin
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en add-existing-user:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}







