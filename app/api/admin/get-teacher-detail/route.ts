import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId es requerido' },
        { status: 400 }
      );
    }

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

    // Obtener información del profesor
    const { data: profesor, error: profesorError } = await supabaseAdmin
      .from('profesores')
      .select('*')
      .eq('id', teacherId)
      .single();

    if (profesorError || !profesor) {
      return NextResponse.json(
        { error: 'Profesor no encontrado' },
        { status: 404 }
      );
    }

    // Obtener cursos asignados al profesor
    const { data: cursosAsignados, error: cursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select(`
        curso_id,
        cursos:curso_id (
          id,
          nombre,
          nivel,
          materias (
            id,
            nombre,
            periodos (
              id,
              nombre,
              fecha_inicio,
              fecha_fin,
              temas (
                id,
                nombre,
                subtemas (
                  id,
                  nombre,
                  contenido (
                    id,
                    titulo,
                    tipo,
                    url,
                    archivo_url,
                    created_at
                  )
                )
              )
            )
          )
        )
      `)
      .eq('profesor_id', teacherId);

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    const cursos = cursosAsignados?.map((pc: any) => pc.cursos).filter(Boolean) || [];
    const cursoIds = cursos.map((c: any) => c.id) || [];

    // Obtener todas las materias de los cursos asignados
    const materiaIds: string[] = [];
    cursos.forEach((curso: any) => {
      if (curso.materias) {
        curso.materias.forEach((materia: any) => {
          if (!materiaIds.includes(materia.id)) {
            materiaIds.push(materia.id);
          }
        });
      }
    });

    // Obtener todos los periodos de las materias
    const periodoIds: string[] = [];
    cursos.forEach((curso: any) => {
      if (curso.materias) {
        curso.materias.forEach((materia: any) => {
          if (materia.periodos) {
            materia.periodos.forEach((periodo: any) => {
              if (!periodoIds.includes(periodo.id)) {
                periodoIds.push(periodo.id);
              }
            });
          }
        });
      }
    });

    // Obtener todos los temas de los periodos
    const temaIds: string[] = [];
    cursos.forEach((curso: any) => {
      if (curso.materias) {
        curso.materias.forEach((materia: any) => {
          if (materia.periodos) {
            materia.periodos.forEach((periodo: any) => {
              if (periodo.temas) {
                periodo.temas.forEach((tema: any) => {
                  if (!temaIds.includes(tema.id)) {
                    temaIds.push(tema.id);
                  }
                });
              }
            });
          }
        });
      }
    });

    // Obtener todos los subtemas de los temas
    const subtemaIds: string[] = [];
    cursos.forEach((curso: any) => {
      if (curso.materias) {
        curso.materias.forEach((materia: any) => {
          if (materia.periodos) {
            materia.periodos.forEach((periodo: any) => {
              if (periodo.temas) {
                periodo.temas.forEach((tema: any) => {
                  if (tema.subtemas) {
                    tema.subtemas.forEach((subtema: any) => {
                      if (!subtemaIds.includes(subtema.id)) {
                        subtemaIds.push(subtema.id);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // Obtener quizzes creados por el profesor (de los subtemas de sus cursos)
    let quizzes: any[] = [];
    if (subtemaIds.length > 0) {
      const { data: quizzesData, error: quizzesError } = await supabaseAdmin
        .from('quizzes')
        .select(`
          id,
          nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          is_active,
          fecha_creacion,
          subtema_id,
          subtemas (
            id,
            nombre,
            tema_id,
            temas (
              id,
              nombre,
              periodo_id,
              periodos (
                id,
                nombre,
                materia_id,
                materias (
                  id,
                  nombre,
                  curso_id,
                  cursos (
                    id,
                    nombre,
                    nivel
                  )
                )
              )
            )
          )
        `)
        .in('subtema_id', subtemaIds)
        .order('fecha_creacion', { ascending: false });

      if (!quizzesError && quizzesData) {
        quizzes = quizzesData;
      }
    }

    // Obtener evaluaciones creadas por el profesor (de los periodos de sus materias)
    let evaluaciones: any[] = [];
    if (periodoIds.length > 0 && materiaIds.length > 0) {
      const { data: evaluacionesData, error: evaluacionesError } = await supabaseAdmin
        .from('evaluaciones_periodo')
        .select(`
          id,
          nombre,
          descripcion,
          fecha_inicio,
          fecha_fin,
          is_active,
          fecha_creacion,
          periodo_id,
          materia_id,
          periodos (
            id,
            nombre,
            materia_id,
            materias (
              id,
              nombre,
              curso_id,
              cursos (
                id,
                nombre,
                nivel
              )
            )
          ),
          materias (
            id,
            nombre,
            curso_id,
            cursos (
              id,
              nombre,
              nivel
            )
          )
        `)
        .in('periodo_id', periodoIds)
        .in('materia_id', materiaIds)
        .order('fecha_creacion', { ascending: false });

      if (!evaluacionesError && evaluacionesData) {
        evaluaciones = evaluacionesData;
      }
    }

    // Calcular estadísticas de contenido por materia
    const contenidoPorMateria: { [materiaId: string]: { materia: any, total: number, porTipo: { [tipo: string]: number } } } = {};
    
    cursos.forEach((curso: any) => {
      if (curso.materias) {
        curso.materias.forEach((materia: any) => {
          if (!contenidoPorMateria[materia.id]) {
            contenidoPorMateria[materia.id] = {
              materia: { id: materia.id, nombre: materia.nombre, curso: { id: curso.id, nombre: curso.nombre, nivel: curso.nivel } },
              total: 0,
              porTipo: {}
            };
          }

          if (materia.periodos) {
            materia.periodos.forEach((periodo: any) => {
              if (periodo.temas) {
                periodo.temas.forEach((tema: any) => {
                  if (tema.subtemas) {
                    tema.subtemas.forEach((subtema: any) => {
                      if (subtema.contenido) {
                        subtema.contenido.forEach((cont: any) => {
                          contenidoPorMateria[materia.id].total++;
                          const tipo = cont.tipo || 'desconocido';
                          contenidoPorMateria[materia.id].porTipo[tipo] = (contenidoPorMateria[materia.id].porTipo[tipo] || 0) + 1;
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        profesor,
        cursos: cursos.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          nivel: c.nivel,
        })),
        contenidoPorMateria: Object.values(contenidoPorMateria),
        quizzes,
        evaluaciones,
        estadisticas: {
          totalCursos: cursos.length,
          totalQuizzes: quizzes.length,
          totalEvaluaciones: evaluaciones.length,
          totalContenido: Object.values(contenidoPorMateria).reduce((sum, m) => sum + m.total, 0),
        },
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error al obtener detalle del profesor:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

