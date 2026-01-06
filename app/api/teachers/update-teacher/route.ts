import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      id,
      nombre,
      apellido,
      email,
      password,
      foto_url,
      numero_celular,
      indicativo_pais,
      cursos_ids,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del profesor es requerido' },
        { status: 400 }
      );
    }

    // Obtener el profesor actual
    const { data: profesorActual, error: fetchError } = await supabaseAdmin
      .from('profesores')
      .select('id, email')
      .eq('id', id)
      .single();

    if (fetchError || !profesorActual) {
      return NextResponse.json(
        { error: 'Profesor no encontrado' },
        { status: 404 }
      );
    }

    // Construir objeto de datos para actualizar
    const profesorData: any = {
      updated_at: new Date().toISOString(),
    };

    if (nombre !== undefined) profesorData.nombre = nombre;
    if (apellido !== undefined) profesorData.apellido = apellido;
    if (email !== undefined) profesorData.email = email;
    if (foto_url !== undefined) profesorData.foto_url = foto_url;
    if (numero_celular !== undefined) profesorData.numero_celular = numero_celular || null;
    if (indicativo_pais !== undefined) profesorData.indicativo_pais = indicativo_pais;
    if (is_active !== undefined) profesorData.is_active = is_active;

    // Actualizar profesor
    const { data: profesor, error: updateError } = await supabaseAdmin
      .from('profesores')
      .update(profesorData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error al actualizar profesor:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Error al actualizar el profesor' },
        { status: 500 }
      );
    }

    // Si se cambió el email, actualizar también en auth.users
    if (email !== undefined && email !== profesorActual.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { email }
      );

      if (authError) {
        console.warn('Error al actualizar email en Auth:', authError);
        // No fallar si solo falla la actualización del email
      }
    }

    // Si se cambió la contraseña, actualizar en auth.users
    if (password !== undefined && password.trim() !== '') {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password }
      );

      if (passwordError) {
        console.warn('Error al actualizar contraseña en Auth:', passwordError);
        // No fallar si solo falla la actualización de la contraseña
      }
    }

    // Actualizar cursos asignados si se proporcionaron
    if (cursos_ids !== undefined && Array.isArray(cursos_ids)) {
      // Eliminar todas las asignaciones actuales
      await supabaseAdmin
        .from('profesores_cursos')
        .delete()
        .eq('profesor_id', id);

      // Crear nuevas asignaciones
      if (cursos_ids.length > 0) {
        const cursosAsignaciones = cursos_ids.map((curso_id: string) => ({
          profesor_id: id,
          curso_id: curso_id,
        }));

        const { error: cursosError } = await supabaseAdmin
          .from('profesores_cursos')
          .insert(cursosAsignaciones);

        if (cursosError) {
          console.warn('Error al actualizar cursos asignados:', cursosError);
          // No fallar si solo falla la asignación de cursos
        }
      }
    }

    // Obtener cursos asignados actualizados
    const { data: cursosAsignados } = await supabaseAdmin
      .from('profesores_cursos')
      .select(`
        curso_id,
        cursos:curso_id (
          id,
          nombre,
          nivel
        )
      `)
      .eq('profesor_id', id);

    const profesorConCursos = {
      ...profesor,
      cursos: cursosAsignados?.map((pc: any) => pc.cursos).filter(Boolean) || [],
    };

    return NextResponse.json({
      success: true,
      message: 'Profesor actualizado exitosamente',
      data: profesorConCursos,
    });
  } catch (error: any) {
    console.error('Error en update-teacher:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
