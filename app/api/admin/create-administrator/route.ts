import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con service role key para operaciones admin
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

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado. Agrega esta variable a tu archivo .env.local' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { nombre, apellido, email, password, foto_url } = body;

    // Validar datos requeridos
    if (!nombre || !apellido || !email || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError);
      return NextResponse.json(
        { error: authError.message || 'Error al crear el usuario' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 400 }
      );
    }

    // 2. Obtener el ID del usuario que está creando (desde el token)
    const authHeader = request.headers.get('authorization');
    let createdBy = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        // Usar el cliente admin para obtener el usuario desde el token
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        createdBy = user?.id;
      } catch (tokenError) {
        // Si no se puede obtener el usuario, continuar con createdBy = null
        console.warn('No se pudo obtener el usuario desde el token:', tokenError);
      }
    }

    // 3. Insertar datos en la tabla administrators usando el cliente admin
    const { error: insertError } = await supabaseAdmin
      .from('administrators')
      .insert({
        id: authData.user.id,
        email,
        password_hash: '', // No guardamos el hash, Supabase Auth lo maneja
        nombre,
        apellido,
        foto_url: foto_url || null,
        role: 'administrator',
        created_by: createdBy,
      });

    if (insertError) {
      // Si falla la inserción, eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error al insertar en tabla administrators:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Error al guardar los datos del administrador' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Administrador creado exitosamente',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en create-administrator:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

