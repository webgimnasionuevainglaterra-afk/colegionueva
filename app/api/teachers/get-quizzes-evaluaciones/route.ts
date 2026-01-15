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

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
    }

    // Obtener los cursos asignados al profesor
    const { data: cursosAsignados, error: cursosError } = await supabaseAdmin
      .from('profesores_cursos')
      .select(`
        curso_id,
        cursos (
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
              fecha_fin
            )
          )
        )
      `)
      .eq('profesor_id', user.id);

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    const cursoIds = cursosAsignados?.map((pc: any) => pc.cursos?.id).filter(Boolean) || [];
    
    if (cursoIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      }, { status: 200 });
    }

    // Obtener todas las materias de los cursos asignados
    const { data: materias, error: materiasError } = await supabaseAdmin
      .from('materias')
      .select(`
        id,
        nombre,
        curso_id,
        cursos (
          id,
          nombre,
          nivel
        ),
        periodos (
          id,
          nombre,
          fecha_inicio,
          fecha_fin
        )
      `)
      .in('curso_id', cursoIds);

    if (materiasError) {
      console.error('Error al obtener materias:', materiasError);
      return NextResponse.json(
        { error: materiasError.message || 'Error al obtener las materias' },
        { status: 500 }
      );
    }

    // Obtener todos los periodos de las materias
    const periodoIds = materias?.flatMap((m: any) => 
      m.periodos?.map((p: any) => p.id) || []
    ).filter(Boolean) || [];

      // Obtener temas de los periodos (los temas están relacionados con periodo_id, no materia_id)
      const { data: temas, error: temasError } = await supabaseAdmin
        .from('temas')
        .select(`
          id,
          nombre,
          periodo_id,
          subtemas (
            id,
            nombre,
            descripcion
          )
        `)
        .in('periodo_id', periodoIds);

    if (temasError) {
      console.error('Error al obtener temas:', temasError);
    }

    const subtemaIds = temas?.flatMap((t: any) => 
      t.subtemas?.map((s: any) => s.id) || []
    ).filter(Boolean) || [];
    
    console.log('📋 Periodos encontrados:', periodoIds.length);
    console.log('📋 Temas encontrados:', temas?.length || 0);
    console.log('📋 Subtemas encontrados:', subtemaIds.length);

    // Obtener todos los quizzes de los subtemas
    let quizzes: any[] = [];
    if (subtemaIds.length > 0) {
      console.log('🔍 Buscando quizzes en subtemas:', subtemaIds.slice(0, 5), '... (total:', subtemaIds.length, ')');
      
      // Primero obtener los quizzes básicos
      const { data: quizzesData, error: quizzesError } = await supabaseAdmin
        .from('quizzes')
        .select(`
          id,
          nombre,
          descripcion,
          subtema_id,
          fecha_inicio,
          fecha_fin,
          is_active
        `)
        .in('subtema_id', subtemaIds);

      if (quizzesError) {
        console.error('❌ Error al obtener quizzes:', quizzesError);
      } else if (quizzesData && quizzesData.length > 0) {
        console.log('✅ Quizzes básicos obtenidos:', quizzesData.length);
        
        // Ahora obtener la información completa de cada quiz con sus relaciones
        for (const quiz of quizzesData) {
          const { data: subtemaData, error: subtemaError } = await supabaseAdmin
            .from('subtemas')
            .select(`
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
            `)
            .eq('id', quiz.subtema_id)
            .single();

          if (!subtemaError && subtemaData) {
            quizzes.push({
              ...quiz,
              subtemas: subtemaData,
            });
          } else {
            console.warn(`⚠️ No se pudo obtener información del subtema ${quiz.subtema_id} para el quiz "${quiz.nombre}"`);
            // Agregar el quiz de todas formas pero sin la información del subtema
            quizzes.push({
              ...quiz,
              subtemas: null,
            });
          }
        }
        
        console.log('✅ Quizzes obtenidos con relaciones:', quizzes.length);
        quizzes.forEach((q: any) => {
          const periodoNombre = q.subtemas?.temas?.periodos?.nombre || 'N/A';
          const materiaNombre = q.subtemas?.temas?.periodos?.materias?.nombre || 'N/A';
          console.log(`  - ${q.nombre} (Subtema: ${q.subtema_id}, Periodo: ${periodoNombre}, Materia: ${materiaNombre})`);
          if (!q.subtemas || !q.subtemas.temas || !q.subtemas.temas.periodos) {
            console.warn(`    ⚠️ Quiz "${q.nombre}" tiene estructura incompleta:`, {
              tiene_subtemas: !!q.subtemas,
              tiene_temas: !!q.subtemas?.temas,
              tiene_periodos: !!q.subtemas?.temas?.periodos,
            });
          }
        });
      } else {
        console.log('⚠️ No se encontraron quizzes para los subtemas proporcionados');
        // Intentar obtener todos los quizzes para debug
        const { data: allQuizzes } = await supabaseAdmin
          .from('quizzes')
          .select('id, nombre, subtema_id')
          .limit(10);
        console.log('🔍 Total de quizzes en la BD (primeros 10):', allQuizzes?.length || 0);
        if (allQuizzes && allQuizzes.length > 0) {
          console.log('  Ejemplos:', allQuizzes.map((q: any) => `${q.nombre} (subtema: ${q.subtema_id})`));
          // Verificar si alguno de estos quizzes está en los subtemaIds
          const quizzesEnSubtemaIds = allQuizzes.filter((q: any) => subtemaIds.includes(q.subtema_id));
          console.log(`  Quizzes que deberían estar en subtemaIds: ${quizzesEnSubtemaIds.length}`);
          if (quizzesEnSubtemaIds.length > 0) {
            console.log('  ⚠️ Hay quizzes que deberían haberse obtenido pero no se obtuvieron');
            quizzesEnSubtemaIds.forEach((q: any) => {
              console.log(`    - ${q.nombre} (subtema_id: ${q.subtema_id})`);
            });
          }
        }
      }
    } else {
      console.log('⚠️ No hay subtemas para buscar quizzes (subtemaIds está vacío)');
    }

    // Obtener todas las evaluaciones de periodo (usando los periodoIds ya obtenidos arriba)
    const materiaIds = materias?.map((m: any) => m.id).filter(Boolean) || [];
    
    let evaluaciones: any[] = [];
    if (periodoIds.length > 0 && materiaIds.length > 0) {
      console.log('🔍 Buscando evaluaciones para periodos:', periodoIds.length, 'y materias:', materiaIds.length);
      const { data: evaluacionesData, error: evaluacionesError } = await supabaseAdmin
        .from('evaluaciones_periodo')
        .select(`
          id,
          nombre,
          descripcion,
          periodo_id,
          is_active,
          materia_id,
          fecha_inicio,
          fecha_fin,
          periodos (
            id,
            nombre,
            fecha_inicio,
            fecha_fin,
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
        .in('materia_id', materiaIds);

      if (!evaluacionesError && evaluacionesData) {
        evaluaciones = evaluacionesData;
        console.log('✅ Evaluaciones obtenidas:', evaluaciones.length);
        evaluaciones.forEach((e: any) => {
          console.log(`  - ${e.nombre} (Periodo: ${e.periodo_id}, Materia: ${e.materia_id})`);
        });
      } else if (evaluacionesError) {
        console.error('❌ Error al obtener evaluaciones:', evaluacionesError);
      }
    } else {
      console.log('⚠️ No se pueden obtener evaluaciones: periodoIds =', periodoIds.length, 'materiaIds =', materiaIds.length);
    }

    // Organizar los datos por curso, materia y periodo
    const datosOrganizados = cursosAsignados?.map((pc: any) => {
      const curso = pc.cursos;
      if (!curso) return null;

      const materiasDelCurso = materias?.filter((m: any) => m.curso_id === curso.id) || [];

      const materiasConDatos = materiasDelCurso.map((materia: any) => {
        console.log(`\n🔍 Procesando materia: ${materia.nombre} (ID: ${materia.id})`);
        console.log(`  Periodos de la materia:`, materia.periodos?.map((p: any) => p.nombre).join(', ') || 'ninguno');
        console.log(`  Total quizzes disponibles para filtrar: ${quizzes.length}`);
        
        // Obtener quizzes de esta materia (a través de subtemas -> temas -> periodos -> materias)
        const quizzesMateria = quizzes.filter((q: any) => {
          // periodos es un objeto singular (no array) porque es una relación FK
          const materiaId = q.subtemas?.temas?.periodos?.materias?.id;
          const periodoId = q.subtemas?.temas?.periodo_id;
          
          // Debug
          if (!q.subtemas || !q.subtemas.temas) {
            console.log(`    ⚠️ Quiz "${q.nombre}" no tiene subtemas o temas`);
            return false;
          }
          
          // Verificar que el periodo del quiz pertenece a esta materia
          const periodo = materia.periodos?.find((p: any) => p.id === periodoId);
          const matches = periodo && materiaId === materia.id;
          
          if (!matches && periodoId) {
            console.log(`    ❌ Quiz "${q.nombre}" no coincide:`, {
              materiaId_quiz: materiaId,
              materiaId_esperado: materia.id,
              periodoId_quiz: periodoId,
              periodo_encontrado: periodo ? periodo.nombre : 'NO ENCONTRADO',
              periodos_materia: materia.periodos?.map((p: any) => `${p.nombre} (${p.id})`).join(', '),
            });
          } else if (matches) {
            console.log(`    ✅ Quiz "${q.nombre}" pertenece a materia "${materia.nombre}" y periodo "${periodo?.nombre}"`);
          }
          
          return matches;
        });
        
        console.log(`📊 Materia ${materia.nombre}: ${quizzesMateria.length} quizzes encontrados de ${quizzes.length} totales`);

        // Obtener evaluaciones de esta materia
        const evaluacionesMateria = evaluaciones.filter((e: any) => {
          return e.materia_id === materia.id;
        });

        // Organizar por periodos
        const periodosConDatos = materia.periodos?.map((periodo: any) => {
          // Quizzes del periodo (a través de subtemas -> temas -> periodo_id)
          const quizzesPeriodo = quizzesMateria.filter((q: any) => {
            const periodoIdDelQuiz = q.subtemas?.temas?.periodo_id;
            const matches = periodoIdDelQuiz === periodo.id;
            if (matches) {
              console.log(`    ✅ Quiz "${q.nombre}" pertenece al periodo "${periodo.nombre}"`);
            }
            return matches;
          });
          
          if (quizzesPeriodo.length > 0) {
            console.log(`    📝 Total quizzes en periodo "${periodo.nombre}": ${quizzesPeriodo.length}`);
          }

          // Evaluaciones del periodo
          const evaluacionesPeriodo = evaluacionesMateria.filter((e: any) => {
            return e.periodo_id === periodo.id;
          });
          
          console.log(`  📅 Periodo ${periodo.nombre}: ${quizzesPeriodo.length} quizzes, ${evaluacionesPeriodo.length} evaluaciones`);

          return {
            ...periodo,
            quizzes: quizzesPeriodo,
            evaluaciones: evaluacionesPeriodo,
          };
        }) || [];

        return {
          ...materia,
          periodos: periodosConDatos,
          quizzes: quizzesMateria,
          evaluaciones: evaluacionesMateria,
        };
      });

      return {
        curso: {
          id: curso.id,
          nombre: curso.nombre,
          nivel: curso.nivel,
        },
        materias: materiasConDatos,
      };
    }).filter(Boolean) || [];

    console.log('📊 Datos organizados para respuesta:', JSON.stringify(datosOrganizados, null, 2));
    
    return NextResponse.json({
      success: true,
      data: datosOrganizados,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-quizzes-evaluaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

