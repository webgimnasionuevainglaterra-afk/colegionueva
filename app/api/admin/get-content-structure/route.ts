import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verificar el usuario
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuario no válido' },
        { status: 401 }
      );
    }

    // Verificar que sea super administrador
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('role')
      .eq('id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'No tienes permiso para acceder a esta función' },
        { status: 403 }
      );
    }

    // Obtener todos los cursos con su estructura completa
    const { data: cursos, error: cursosError } = await supabaseAdmin
      .from('cursos')
      .select('id, nombre, nivel')
      .order('nombre', { ascending: true });

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    // Para cada curso, obtener materias con periodos, temas y subtemas
    const cursosConEstructura = await Promise.all(
      (cursos || []).map(async (curso) => {
        // Obtener materias del curso
        const { data: materias, error: materiasError } = await supabaseAdmin
          .from('materias')
          .select('id, nombre, descripcion, curso_id')
          .eq('curso_id', curso.id)
          .order('nombre', { ascending: true });

        if (materiasError) {
          console.error(`Error al obtener materias del curso ${curso.id}:`, materiasError);
          return { ...curso, materias: [] };
        }

        // Para cada materia, obtener periodos con temas y subtemas
        const materiasConEstructura = await Promise.all(
          (materias || []).map(async (materia) => {
            // Obtener periodos de la materia
            const { data: periodos, error: periodosError } = await supabaseAdmin
              .from('periodos')
              .select('id, nombre, numero_periodo, fecha_inicio, fecha_fin')
              .eq('materia_id', materia.id)
              .order('numero_periodo', { ascending: true });

            if (periodosError) {
              console.error(`Error al obtener periodos de la materia ${materia.id}:`, periodosError);
              return { ...materia, periodos: [] };
            }

            // Para cada periodo, obtener temas con subtemas
            const periodosConEstructura = await Promise.all(
              (periodos || []).map(async (periodo) => {
                // Obtener temas del periodo
                const { data: temas, error: temasError } = await supabaseAdmin
                  .from('temas')
                  .select('id, nombre, descripcion, orden')
                  .eq('periodo_id', periodo.id)
                  .order('orden', { ascending: true });

                if (temasError) {
                  console.error(`Error al obtener temas del periodo ${periodo.id}:`, temasError);
                  return { ...periodo, temas: [] };
                }

                // Para cada tema, obtener subtemas con su contenido
                const temasConSubtemas = await Promise.all(
                  (temas || []).map(async (tema) => {
                    const { data: subtemas, error: subtemasError } = await supabaseAdmin
                      .from('subtemas')
                      .select('id, nombre, descripcion, orden')
                      .eq('tema_id', tema.id)
                      .order('orden', { ascending: true });

                    if (subtemasError) {
                      console.error(`Error al obtener subtemas del tema ${tema.id}:`, subtemasError);
                      return { ...tema, subtemas: [] };
                    }

                    // Para cada subtema, obtener su contenido
                    const subtemasConContenido = await Promise.all(
                      (subtemas || []).map(async (subtema) => {
                        const { data: contenido, error: contenidoError } = await supabaseAdmin
                          .from('contenido')
                          .select('id, tipo, titulo, descripcion, url, archivo_url, orden')
                          .eq('subtema_id', subtema.id)
                          .order('orden', { ascending: true });

                        if (contenidoError) {
                          console.error(`Error al obtener contenido del subtema ${subtema.id}:`, contenidoError);
                          return { ...subtema, contenido: [] };
                        }

                        return {
                          ...subtema,
                          contenido: contenido || [],
                        };
                      })
                    );

                    return {
                      ...tema,
                      subtemas: subtemasConContenido,
                    };
                  })
                );

                return {
                  ...periodo,
                  temas: temasConSubtemas,
                };
              })
            );

            return {
              ...materia,
              periodos: periodosConEstructura,
            };
          })
        );

        return {
          ...curso,
          materias: materiasConEstructura,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: cursosConEstructura },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-content-structure:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

