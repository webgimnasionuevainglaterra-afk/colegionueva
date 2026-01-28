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

    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }
    
    // Verificar el token y obtener el usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Error al verificar token:', userError);
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 401 }
      );
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      );
    }

    // Primero verificar si es administrador
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!adminError && adminData) {
      // Determinar el rol a mostrar
      let roleDisplay = 'Administrador';
      if (adminData.role === 'super_admin') {
        roleDisplay = 'Super administrador';
      } else if (adminData.role === 'administrator') {
        roleDisplay = 'Administrador';
      } else if (adminData.role) {
        roleDisplay = adminData.role;
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
    }

    // Si no es administrador, verificar si es profesor
    const { data: profesorData, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profesorError && profesorData) {
      return NextResponse.json(
        { 
          success: true,
          data: {
            id: profesorData.id,
            email: profesorData.email,
            nombre: profesorData.nombre,
            apellido: profesorData.apellido,
            foto_url: profesorData.foto_url,
            role: 'Profesor',
            is_online: profesorData.is_online !== undefined ? profesorData.is_online : false,
          }
        },
        { status: 200 }
      );
    }

    // Si no es administrador ni profesor, verificar si es estudiante
    const { data: estudianteData, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!estudianteError && estudianteData) {
      return NextResponse.json(
        { 
          success: true,
          data: {
            id: estudianteData.id,
            email: estudianteData.correo_electronico,
            nombre: estudianteData.nombre,
            apellido: estudianteData.apellido,
            foto_url: estudianteData.foto_url,
            role: 'Estudiante',
            is_online: estudianteData.is_online !== undefined ? estudianteData.is_online : false,
          }
        },
        { status: 200 }
      );
    }

    // Si no está en ninguna tabla, devolver datos básicos del usuario
    return NextResponse.json(
      { 
        success: true,
        data: {
          id: user.id,
          email: user.email,
          nombre: user.email?.split('@')[0] || 'Usuario',
          apellido: '',
          foto_url: null,
          role: 'Usuario',
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

