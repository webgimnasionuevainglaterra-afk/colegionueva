import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const archivo = formData.get('archivo') as File;
    const curso_id = formData.get('curso_id') as string;

    if (!archivo) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (!curso_id) {
      return NextResponse.json(
        { error: 'curso_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Leer el archivo
    const texto = await archivo.text();
    const lineas = texto.split('\n').filter(linea => linea.trim());

    if (lineas.length < 2) {
      return NextResponse.json(
        { error: 'El archivo debe tener al menos una fila de datos (además del encabezado)' },
        { status: 400 }
      );
    }

    // Parsear CSV (formato esperado: nombre,apellido,edad,correo,telefono,cedula,acudiente_nombre,acudiente_apellido,acudiente_correo,acudiente_cedula,acudiente_telefono)
    const encabezados = lineas[0].split(',').map(h => h.trim().toLowerCase());
    const datos = lineas.slice(1).map(linea => {
      const valores = linea.split(',').map(v => v.trim());
      const objeto: any = {};
      encabezados.forEach((encabezado, index) => {
        objeto[encabezado] = valores[index] || '';
      });
      return objeto;
    });

    const estudiantesCreados: any[] = [];
    const errores: string[] = [];

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      try {
        // Validar campos requeridos
        if (!fila.nombre || !fila.apellido || !fila.correo || !fila.cedula) {
          errores.push(`Fila ${i + 2}: Faltan campos requeridos (nombre, apellido, correo, cedula)`);
          continue;
        }

        // Crear o obtener acudiente si se proporciona
        let acudienteId: string | null = null;
        if (fila.acudiente_nombre && fila.acudiente_apellido && fila.acudiente_correo && fila.acudiente_cedula) {
          const { data: acudienteExistente } = await supabaseAdmin
            .from('acudientes')
            .select('id')
            .eq('correo_electronico', fila.acudiente_correo)
            .single();

          if (acudienteExistente) {
            acudienteId = acudienteExistente.id;
          } else {
            const { data: nuevoAcudiente, error: acudienteError } = await supabaseAdmin
              .from('acudientes')
              .insert({
                nombre: fila.acudiente_nombre,
                apellido: fila.acudiente_apellido,
                correo_electronico: fila.acudiente_correo,
                numero_cedula: fila.acudiente_cedula,
                numero_telefono: fila.acudiente_telefono || null,
                indicativo_pais: '+57',
              })
              .select()
              .single();

            if (!acudienteError && nuevoAcudiente) {
              acudienteId = nuevoAcudiente.id;
            }
          }
        }

        // Verificar si el estudiante ya existe
        const { data: estudianteExistente } = await supabaseAdmin
          .from('estudiantes')
          .select('id')
          .eq('correo_electronico', fila.correo)
          .single();

        if (estudianteExistente) {
          // Si existe, solo asignarlo al curso si no está ya asignado
          const { data: asignacionExistente } = await supabaseAdmin
            .from('estudiantes_cursos')
            .select('id')
            .eq('estudiante_id', estudianteExistente.id)
            .eq('curso_id', curso_id)
            .single();

          if (!asignacionExistente) {
            await supabaseAdmin
              .from('estudiantes_cursos')
              .insert({
                estudiante_id: estudianteExistente.id,
                curso_id,
              });
          }
          estudiantesCreados.push({ id: estudianteExistente.id, nombre: fila.nombre, apellido: fila.apellido, accion: 'asignado' });
          continue;
        }

        // Crear usuario en auth
        const ultimos4Digitos = fila.cedula.slice(-4);
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: fila.correo,
          password: ultimos4Digitos,
          email_confirm: true,
        });

        if (authError) {
          errores.push(`Fila ${i + 2}: Error al crear usuario - ${authError.message}`);
          continue;
        }

        // Crear estudiante
        const { data: estudiante, error: estudianteError } = await supabaseAdmin
          .from('estudiantes')
          .insert({
            user_id: authUser.user.id,
            nombre: fila.nombre,
            apellido: fila.apellido,
            edad: fila.edad ? parseInt(fila.edad) : null,
            correo_electronico: fila.correo,
            numero_telefono: fila.telefono || null,
            indicativo_pais: '+57',
            tarjeta_identidad: fila.cedula,
            acudiente_id: acudienteId,
          })
          .select()
          .single();

        if (estudianteError) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          errores.push(`Fila ${i + 2}: Error al crear estudiante - ${estudianteError.message}`);
          continue;
        }

        // Asignar al curso
        await supabaseAdmin
          .from('estudiantes_cursos')
          .insert({
            estudiante_id: estudiante.id,
            curso_id,
          });

        estudiantesCreados.push({ id: estudiante.id, nombre: fila.nombre, apellido: fila.apellido, accion: 'creado' });
      } catch (error: any) {
        errores.push(`Fila ${i + 2}: ${error.message || 'Error desconocido'}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        estudiantesCreados,
        totalCreados: estudiantesCreados.length,
        totalErrores: errores.length,
        errores: errores.length > 0 ? errores : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en importar-estudiantes:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

