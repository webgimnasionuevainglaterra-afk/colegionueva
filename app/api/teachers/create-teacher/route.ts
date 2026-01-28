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
    const { nombre, apellido, email, password, foto_url, numero_celular, indicativo_pais, cursos_ids } = body;

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
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        createdBy = user?.id;
      } catch (tokenError) {
        console.warn('No se pudo obtener el usuario desde el token:', tokenError);
      }
    }

    // 3. Insertar datos en la tabla profesores
    const { data: profesorData, error: insertError } = await supabaseAdmin
      .from('profesores')
      .insert({
        id: authData.user.id,
        email,
        password_hash: '', // No guardamos el hash, Supabase Auth lo maneja
        nombre,
        apellido,
        foto_url: foto_url || null,
        numero_celular: numero_celular || null,
        indicativo_pais: indicativo_pais || '+57',
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError) {
      // Si falla la inserción, eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      console.error('Error al insertar en tabla profesores:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Error al guardar los datos del profesor' },
        { status: 400 }
      );
    }

    // 4. Asignar cursos si se proporcionaron
    if (cursos_ids && Array.isArray(cursos_ids) && cursos_ids.length > 0) {
      const cursosAsignaciones = cursos_ids.map((curso_id: string) => ({
        profesor_id: authData.user.id,
        curso_id: curso_id,
      }));

      const { error: cursosError } = await supabaseAdmin
        .from('profesores_cursos')
        .insert(cursosAsignaciones);

      if (cursosError) {
        console.warn('Error al asignar cursos:', cursosError);
        // No fallar si solo falla la asignación de cursos, pero registrar el error
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Profesor creado exitosamente',
        data: profesorData
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en create-teacher:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}









