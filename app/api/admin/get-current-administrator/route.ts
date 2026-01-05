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

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el ID del usuario desde el header de autorización
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

    // Obtener los datos del administrador desde la tabla
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('*')
      .eq('id', user.id)
      .single();

    if (adminError || !adminData) {
      // Si no está en la tabla administrators, devolver datos básicos del usuario
      return NextResponse.json(
        { 
          success: true,
          data: {
            id: user.id,
            email: user.email,
            nombre: user.email?.split('@')[0] || 'Usuario',
            apellido: '',
            foto_url: null,
            role: 'user',
          }
        },
        { status: 200 }
      );
    }

    // Determinar el rol a mostrar
    let roleDisplay = 'Administrador';
    if (user.id === 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42') {
      roleDisplay = 'Super administrador';
    } else if (adminData.role) {
      roleDisplay = adminData.role === 'administrator' ? 'Administrador' : adminData.role;
    }

    return NextResponse.json(
      { 
        success: true,
        data: {
          id: adminData.id,
          email: adminData.email,
          nombre: adminData.nombre,
          apellido: adminData.apellido,
          foto_url: adminData.foto_url,
          role: roleDisplay,
          is_online: adminData.is_online || false,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-current-administrator:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

