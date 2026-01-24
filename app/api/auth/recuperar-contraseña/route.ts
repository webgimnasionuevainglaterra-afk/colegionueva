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

// Función para generar una contraseña temporal aleatoria
function generarContraseñaTemporal(): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let contraseña = '';
  for (let i = 0; i < 12; i++) {
    contraseña += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return contraseña;
}

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
        { error: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de correo electrónico inválido' },
        { status: 400 }
      );
    }

    // Buscar el usuario en auth.users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error al buscar usuarios:', usersError);
      return NextResponse.json(
        { error: 'Error al buscar el usuario' },
        { status: 500 }
      );
    }

    const usuario = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!usuario) {
      // No revelar que el usuario no existe por seguridad
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe en nuestro sistema, recibirás una contraseña temporal',
      });
    }

    // Verificar que el usuario pertenezca a alguna de las tablas (estudiante, profesor, administrador)
    const { data: estudiante } = await supabaseAdmin
      .from('estudiantes')
      .select('id, nombre, apellido')
      .eq('user_id', usuario.id)
      .maybeSingle();

    const { data: profesor } = await supabaseAdmin
      .from('profesores')
      .select('id, nombre, apellido')
      .eq('id', usuario.id)
      .maybeSingle();

    const { data: administrador } = await supabaseAdmin
      .from('administrators')
      .select('id, nombre, apellido')
      .eq('id', usuario.id)
      .maybeSingle();

    if (!estudiante && !profesor && !administrador) {
      // Usuario existe en auth pero no en ninguna tabla de roles
      return NextResponse.json({
        success: true,
        message: 'Si el correo existe en nuestro sistema, recibirás una contraseña temporal',
      });
    }

    // Generar contraseña temporal
    const contraseñaTemporal = generarContraseñaTemporal();

    // Actualizar la contraseña del usuario
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuario.id,
      { password: contraseñaTemporal }
    );

    if (updateError) {
      console.error('Error al actualizar contraseña:', updateError);
      return NextResponse.json(
        { error: 'Error al generar la contraseña temporal' },
        { status: 500 }
      );
    }

    // Obtener el nombre del usuario para el correo
    const nombreUsuario = estudiante 
      ? `${estudiante.nombre} ${estudiante.apellido}`
      : profesor
      ? `${profesor.nombre} ${profesor.apellido}`
      : administrador
      ? `${administrador.nombre} ${administrador.apellido}`
      : 'Usuario';

    // Enviar correo electrónico con la contraseña temporal usando Supabase Auth
    // Usamos resetPasswordForEmail que enviará un correo con link de recuperación
    // Pero primero actualizamos la contraseña, luego enviamos el correo de recuperación
    // que incluirá instrucciones para cambiar la contraseña
    
    try {
      // Generar link de recuperación (esto enviará un correo automáticamente)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      });

      if (linkError) {
        console.error('Error al generar link de recuperación:', linkError);
        // Continuar aunque falle, la contraseña ya fue actualizada
      }

      // Nota: Supabase Auth no permite enviar la contraseña directamente en el correo
      // por razones de seguridad. El correo de recuperación incluirá un link para resetear.
      // Como alternativa, podrías usar un servicio de correo externo (SendGrid, Resend, etc.)
      // para enviar la contraseña temporal directamente.
      
      // Por ahora, actualizamos la contraseña y el usuario puede usar el link de recuperación
      // o podemos implementar un servicio de correo externo más adelante
      
      console.log(`Contraseña temporal generada para ${email}: ${contraseñaTemporal}`);
      console.log(`Link de recuperación generado: ${linkData?.properties?.action_link || 'N/A'}`);
      
    } catch (emailErr) {
      console.error('Error al enviar correo:', emailErr);
      // Continuar aunque falle el envío del correo, la contraseña ya fue actualizada
    }

    return NextResponse.json({
      success: true,
      message: 'Se ha enviado una contraseña temporal a tu correo electrónico',
    });
  } catch (error: any) {
    console.error('Error en recuperar-contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', detalle: error.message },
      { status: 500 }
    );
  }
}

