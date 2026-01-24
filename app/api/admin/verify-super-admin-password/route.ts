import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const SUPER_ADMIN_ID = 'dfdca86b-187f-49c2-8fe5-ee735a2a6d42';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Contraseña requerida' },
        { status: 400 }
      );
    }

    // Obtener el usuario super admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      SUPER_ADMIN_ID
    );

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Super administrador no encontrado' },
        { status: 404 }
      );
    }

    // Verificar la contraseña intentando hacer sign in
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email || 'webgimnasionuevainglaterra@gmail.com',
      password: password,
    });

    if (signInError || !signInData.user) {
      return NextResponse.json(
        { success: false, error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea el super admin
    if (signInData.user.id !== SUPER_ADMIN_ID) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contraseña verificada correctamente',
    });
  } catch (error: any) {
    console.error('Error al verificar contraseña:', error);
    return NextResponse.json(
      { error: 'Error al verificar la contraseña', details: error.message },
      { status: 500 }
    );
  }
}

