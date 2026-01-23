import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      nombre,
      apellido,
      edad,
      correo_electronico,
      numero_telefono,
      tarjeta_identidad,
      sexo,
      foto_url,
      acudiente_nombre,
      acudiente_apellido,
      acudiente_correo_electronico,
      acudiente_numero_cedula,
      acudiente_numero_telefono,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del estudiante es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener el estudiante actual para obtener el user_id y acudiente_id
    const { data: estudianteActual, error: fetchError } = await supabaseAdmin
      .from('estudiantes')
      .select('user_id, acudiente_id')
      .eq('id', id)
      .single();

    if (fetchError || !estudianteActual) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar o crear acudiente si se proporciona
    let acudienteId: string | null = estudianteActual.acudiente_id;
    if (acudiente_nombre && acudiente_apellido && acudiente_correo_electronico && acudiente_numero_cedula) {
      try {
        // Verificar si el acudiente ya existe
        const { data: acudienteExistente, error: buscarError } = await supabaseAdmin
          .from('acudientes')
          .select('id')
          .eq('correo_electronico', acudiente_correo_electronico)
          .maybeSingle();

        if (acudienteExistente) {
          acudienteId = acudienteExistente.id;
          // Actualizar datos del acudiente
          await supabaseAdmin
            .from('acudientes')
            .update({
              nombre: acudiente_nombre,
              apellido: acudiente_apellido,
              numero_telefono: acudiente_numero_telefono || null,
              fecha_actualizacion: new Date().toISOString(),
            })
            .eq('id', acudienteId);
        } else {
          // Crear nuevo acudiente
          const { data: nuevoAcudiente, error: acudienteError } = await supabaseAdmin
            .from('acudientes')
            .insert({
              nombre: acudiente_nombre,
              apellido: acudiente_apellido,
              correo_electronico: acudiente_correo_electronico,
              numero_cedula: acudiente_numero_cedula,
              numero_telefono: acudiente_numero_telefono || null,
              indicativo_pais: '+57',
            })
            .select()
            .single();

          if (acudienteError) {
            console.error('Error al crear acudiente:', acudienteError);
            return NextResponse.json(
              { error: acudienteError.message || 'Error al crear el acudiente' },
              { status: 500 }
            );
          }
          acudienteId = nuevoAcudiente.id;
        }
      } catch (acudienteErr: any) {
        console.error('Error en proceso de acudiente:', acudienteErr);
        // Continuar sin acudiente si hay error
      }
    }

    // Construir objeto de datos para actualizar estudiante
    const estudianteData: any = {
      fecha_actualizacion: new Date().toISOString(),
    };

    if (nombre !== undefined) estudianteData.nombre = nombre;
    if (apellido !== undefined) estudianteData.apellido = apellido;
    if (edad !== undefined) estudianteData.edad = edad ? parseInt(edad) : null;
    if (correo_electronico !== undefined) estudianteData.correo_electronico = correo_electronico;
    if (numero_telefono !== undefined) estudianteData.numero_telefono = numero_telefono || null;
    if (tarjeta_identidad !== undefined) estudianteData.tarjeta_identidad = tarjeta_identidad;
    if (sexo !== undefined && (sexo === 'masculino' || sexo === 'femenino')) estudianteData.sexo = sexo;
    if (foto_url !== undefined) estudianteData.foto_url = foto_url;
    if (acudienteId !== undefined) estudianteData.acudiente_id = acudienteId;

    // Actualizar estudiante
    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .update(estudianteData)
      .eq('id', id)
      .select(`
        *,
        acudientes (
          id,
          nombre,
          apellido,
          correo_electronico,
          numero_cedula,
          numero_telefono
        )
      `)
      .single();

    if (estudianteError) {
      console.error('Error al actualizar estudiante:', estudianteError);
      return NextResponse.json(
        { error: estudianteError.message || 'Error al actualizar el estudiante' },
        { status: 500 }
      );
    }

    // Si se cambió el correo, actualizar también en auth.users
    if (correo_electronico !== undefined && estudianteActual.user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        estudianteActual.user_id,
        { email: correo_electronico }
      );

      if (authError) {
        console.warn('Error al actualizar email en Auth:', authError);
        // No fallar si solo falla la actualización del email
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Estudiante actualizado exitosamente',
      data: estudiante,
    });
  } catch (error: any) {
    console.error('Error en update-estudiante:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}






