import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'email es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Buscar usuario en auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    const authUser = authUsers?.users.find(u => u.email === email);

    if (!authUser) {
      return NextResponse.json({
        exists: false,
        message: 'Usuario no encontrado en auth.users',
        email,
      }, { status: 200 });
    }

    // Verificar si es estudiante
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    // Verificar si es profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // Verificar si es administrador
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // Obtener información del usuario
    const userInfo = {
      id: authUser.id,
      email: authUser.email,
      email_confirmed: authUser.email_confirmed_at !== null,
      created_at: authUser.created_at,
      last_sign_in: authUser.last_sign_in_at,
      is_active: authUser.banned_until === null,
    };

    // Si es estudiante, obtener los últimos 4 dígitos de su cédula
    let passwordHint = null;
    if (estudiante) {
      const tarjetaIdentidad = estudiante.tarjeta_identidad || '';
      passwordHint = tarjetaIdentidad.length >= 4 
        ? tarjetaIdentidad.slice(-4) 
        : 'N/A (cédula no tiene 4 dígitos)';
    }

    return NextResponse.json({
      exists: true,
      user: userInfo,
      roles: {
        estudiante: estudiante ? {
          id: estudiante.id,
          nombre: `${estudiante.nombre} ${estudiante.apellido}`,
          tarjeta_identidad: estudiante.tarjeta_identidad,
          is_active: estudiante.is_active,
          password_should_be: passwordHint,
        } : null,
        profesor: profesor ? {
          id: profesor.id,
          nombre: `${profesor.nombre} ${profesor.apellido}`,
          is_active: profesor.is_active,
        } : null,
        administrador: admin ? {
          id: admin.id,
          role: admin.role,
        } : null,
      },
      issues: [
        !userInfo.email_confirmed ? 'Email no confirmado' : null,
        estudiante && !estudiante.is_active ? 'Estudiante inactivo' : null,
        profesor && !profesor.is_active ? 'Profesor inactivo' : null,
        !userInfo.is_active ? 'Usuario baneado' : null,
      ].filter(Boolean),
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en check-user-login:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






