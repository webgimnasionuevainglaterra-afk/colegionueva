import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Datos recibidos para crear estudiante:', {
      nombre: body.nombre,
      apellido: body.apellido,
      correo: body.correo_electronico,
      sexo: body.sexo,
      curso_id: body.curso_id,
      foto_url: body.foto_url,
      tiene_foto: !!body.foto_url,
      tiene_acudiente: !!(body.acudiente_nombre && body.acudiente_correo_electronico)
    });

    const {
      foto_url,
      nombre,
      apellido,
      edad,
      sexo,
      correo_electronico,
      numero_telefono,
      indicativo_pais,
      tarjeta_identidad,
      acudiente_nombre,
      acudiente_apellido,
      acudiente_correo_electronico,
      acudiente_numero_cedula,
      acudiente_numero_telefono,
      curso_id,
    } = body;

    if (!nombre || !apellido || !correo_electronico || !tarjeta_identidad) {
      return NextResponse.json(
        { error: 'nombre, apellido, correo_electronico y tarjeta_identidad son requeridos' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Crear o obtener acudiente si se proporciona
    let acudienteId: string | null = null;
    if (acudiente_nombre && acudiente_apellido && acudiente_correo_electronico && acudiente_numero_cedula) {
      try {
        // Verificar si el acudiente ya existe
        const { data: acudienteExistente, error: buscarError } = await supabaseAdmin
          .from('acudientes')
          .select('id')
          .eq('correo_electronico', acudiente_correo_electronico)
          .maybeSingle();

        if (buscarError && buscarError.code !== 'PGRST116') {
          // PGRST116 es el código cuando no se encuentra ningún registro, lo cual es normal
          console.error('Error al buscar acudiente:', buscarError);
        }

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

    // Crear usuario en auth.users para el estudiante
    // El password será los últimos 4 dígitos de la cédula
    const ultimos4Digitos = tarjeta_identidad.slice(-4);
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: correo_electronico,
      password: ultimos4Digitos,
      email_confirm: true,
    });

    if (authError) {
      console.error('Error al crear usuario de autenticación:', authError);
      return NextResponse.json(
        { error: authError.message || 'Error al crear el usuario de autenticación' },
        { status: 500 }
      );
    }

    // Crear estudiante
    // Construir objeto de datos dinámicamente para evitar errores si la columna sexo no existe
    const estudianteData: any = {
      user_id: authUser.user.id,
      foto_url: foto_url || null,
      nombre,
      apellido,
      edad: edad || null,
      correo_electronico,
      numero_telefono: numero_telefono || null,
      indicativo_pais: indicativo_pais || '+57',
      tarjeta_identidad,
      acudiente_id: acudienteId,
    };

    // Agregar sexo si se proporciona (es requerido en el frontend)
    if (sexo && (sexo === 'masculino' || sexo === 'femenino')) {
      estudianteData.sexo = sexo;
    } else if (sexo) {
      // Si se proporciona un sexo inválido, retornar error
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: 'El sexo debe ser "masculino" o "femenino"' },
        { status: 400 }
      );
    }

    console.log('📝 Intentando crear estudiante con datos:', {
      user_id: authUser.user.id,
      nombre,
      apellido,
      foto_url_recibida: foto_url,
      foto_url_en_data: estudianteData.foto_url,
      tiene_foto: !!estudianteData.foto_url,
      foto_url_type: typeof estudianteData.foto_url,
      tiene_sexo: !!estudianteData.sexo,
      sexo: estudianteData.sexo,
      tiene_acudiente: !!acudienteId
    });

    console.log('💾 Insertando estudiante con foto_url:', estudianteData.foto_url);

    const { data: estudiante, error: estudianteError } = await supabaseAdmin
      .from('estudiantes')
      .insert(estudianteData)
      .select('*')
      .single();
    
    console.log('💾 Estudiante insertado, foto_url en BD:', estudiante?.foto_url);

    if (estudianteError) {
      // Si falla, eliminar el usuario de auth creado
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      console.error('❌ Error al crear estudiante:', estudianteError);
      console.error('❌ Detalles del error:', {
        message: estudianteError.message,
        details: estudianteError.details,
        hint: estudianteError.hint,
        code: estudianteError.code
      });
      return NextResponse.json(
        { error: estudianteError.message || 'Error al crear el estudiante', details: estudianteError.details },
        { status: 500 }
      );
    }

    console.log('✅ Estudiante creado exitosamente:', estudiante.id);
    console.log('📸 Foto URL en estudiante creado:', estudiante.foto_url);

    // Asignar estudiante al curso si se proporciona y es válido
    if (curso_id && curso_id.trim() !== '') {
      try {
        const { error: asignacionError } = await supabaseAdmin
          .from('estudiantes_cursos')
          .insert({
            estudiante_id: estudiante.id,
            curso_id: curso_id,
          });

        if (asignacionError) {
          console.error('Error al asignar estudiante al curso:', asignacionError);
          // No fallar la creación del estudiante si falla la asignación
        }
      } catch (asignacionErr: any) {
        console.error('Error en asignación de curso:', asignacionErr);
        // Continuar sin asignar curso si hay error
      }
    }

    return NextResponse.json(
      { data: estudiante, message: 'Estudiante creado exitosamente' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en create-estudiante:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

