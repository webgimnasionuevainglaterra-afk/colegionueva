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
    
    // Log detallado por materia
    materias?.forEach((m: any) => {
      const periodosMateria = m.periodos || [];
      const esIngles = m.nombre.toLowerCase().includes('ingles') || m.nombre.toLowerCase().includes('inglés');
      
      if (esIngles) {
        console.log(`\n🇬🇧 ===== MATERIA INGLÉS DETECTADA =====`);
        console.log(`📚 Materia: ${m.nombre} (ID: ${m.id})`);
        console.log(`  Curso ID: ${m.curso_id}`);
        console.log(`  Periodos: ${periodosMateria.length}`);
      } else {
        console.log(`\n📚 Materia: ${m.nombre} (ID: ${m.id})`);
        console.log(`  Periodos: ${periodosMateria.length}`);
      }
      
      periodosMateria.forEach((p: any) => {
        const temasDelPeriodo = temas?.filter((t: any) => t.periodo_id === p.id) || [];
        const subtemasDelPeriodo = temasDelPeriodo.flatMap((t: any) => t.subtemas || []);
        const subtemaIdsDelPeriodo = subtemasDelPeriodo.map((s: any) => s.id);
        const quizzesDelPeriodo = subtemasDelPeriodo.length > 0 ? 
          `(habría ${subtemasDelPeriodo.length} subtemas para buscar quizzes)` : '(sin subtemas)';
        
        if (esIngles) {
          console.log(`    🇬🇧 ${p.nombre} (${p.id}):`);
          console.log(`      - Temas: ${temasDelPeriodo.length}`);
          temasDelPeriodo.forEach((t: any) => {
            console.log(`        • ${t.nombre} (${t.id})`);
            t.subtemas?.forEach((s: any) => {
              console.log(`          - ${s.nombre} (${s.id})`);
            });
          });
          console.log(`      - Subtemas IDs: ${subtemaIdsDelPeriodo.join(', ') || 'ninguno'}`);
          console.log(`      - ${quizzesDelPeriodo}`);
        } else {
          console.log(`    - ${p.nombre} (${p.id}): ${temasDelPeriodo.length} temas ${quizzesDelPeriodo}`);
        }
      });
    });

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
        // Usar LEFT JOIN en lugar de INNER JOIN para no perder quizzes
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
            const materiaNombre = subtemaData.temas?.periodos?.materias?.nombre || 'N/A';
            const periodoNombre = subtemaData.temas?.periodos?.nombre || 'N/A';
            
            // Log específico para inglés
            if (materiaNombre.toLowerCase().includes('ingles') || materiaNombre.toLowerCase().includes('inglés')) {
              console.log(`\n🇬🇧 QUIZ DE INGLÉS ENCONTRADO: "${quiz.nombre}"`);
              console.log(`  - Subtema: ${subtemaData.nombre} (${quiz.subtema_id})`);
              console.log(`  - Tema: ${subtemaData.temas?.nombre || 'N/A'}`);
              console.log(`  - Periodo: ${periodoNombre} (${subtemaData.temas?.periodos?.id || 'N/A'})`);
              console.log(`  - Materia: ${materiaNombre} (${subtemaData.temas?.periodos?.materias?.id || 'N/A'})`);
              console.log(`  - Estructura completa:`, {
                tiene_subtemas: !!subtemaData,
                tiene_temas: !!subtemaData.temas,
                tiene_periodos: !!subtemaData.temas?.periodos,
                tiene_materias: !!subtemaData.temas?.periodos?.materias,
              });
            }
            
            quizzes.push({
              ...quiz,
              subtemas: subtemaData,
            });
          } else {
            console.warn(`⚠️ No se pudo obtener información del subtema ${quiz.subtema_id} para el quiz "${quiz.nombre}"`);
            if (subtemaError) {
              console.error(`  Error:`, subtemaError);
            }
            // Agregar el quiz de todas formas pero sin la información del subtema
            quizzes.push({
              ...quiz,
              subtemas: null,
            });
          }
        }
        
        console.log('✅ Quizzes obtenidos con relaciones:', quizzes.length);
        
        // Contar quizzes por materia
        const quizzesPorMateria: Record<string, number> = {};
        quizzes.forEach((q: any) => {
          const periodoNombre = q.subtemas?.temas?.periodos?.nombre || 'N/A';
          const materiaNombre = q.subtemas?.temas?.periodos?.materias?.nombre || 'N/A';
          
          // Contar por materia
          if (materiaNombre !== 'N/A') {
            quizzesPorMateria[materiaNombre] = (quizzesPorMateria[materiaNombre] || 0) + 1;
          }
          
          console.log(`  - ${q.nombre} (Subtema: ${q.subtema_id}, Periodo: ${periodoNombre}, Materia: ${materiaNombre})`);
          if (!q.subtemas || !q.subtemas.temas || !q.subtemas.temas.periodos) {
            console.warn(`    ⚠️ Quiz "${q.nombre}" tiene estructura incompleta:`, {
              tiene_subtemas: !!q.subtemas,
              tiene_temas: !!q.subtemas?.temas,
              tiene_periodos: !!q.subtemas?.temas?.periodos,
            });
          }
        });
        
        console.log('\n📊 Resumen de quizzes por materia:', quizzesPorMateria);
      } else {
        console.log('⚠️ No se encontraron quizzes para los subtemas proporcionados');
        
        // Log detallado de qué subtemas se buscaron vs qué quizzes hay
        console.log(`\n🔍 DEBUG: Subtemas buscados (${subtemaIds.length}):`, subtemaIds.slice(0, 5), '...');
        
        // Intentar obtener todos los quizzes para debug
        const { data: allQuizzes } = await supabaseAdmin
          .from('quizzes')
          .select('id, nombre, subtema_id')
          .limit(50);
        
        console.log(`🔍 Total de quizzes en la BD (primeros 50):`, allQuizzes?.length || 0);
        
        if (allQuizzes && allQuizzes.length > 0) {
          // Verificar si alguno de estos quizzes está en los subtemaIds
          const quizzesEnSubtemaIds = allQuizzes.filter((q: any) => subtemaIds.includes(q.subtema_id));
          console.log(`  ✅ Quizzes que MATCH con subtemaIds: ${quizzesEnSubtemaIds.length}`);
          
          if (quizzesEnSubtemaIds.length > 0) {
            console.log('  Lista de quizzes que deberían aparecer:');
            quizzesEnSubtemaIds.forEach((q: any) => {
              console.log(`    - ${q.nombre} (subtema_id: ${q.subtema_id})`);
            });
          }
          
          // Verificar quizzes que NO están en los subtemaIds
          const quizzesNoEncontrados = allQuizzes.filter((q: any) => !subtemaIds.includes(q.subtema_id));
          if (quizzesNoEncontrados.length > 0) {
            console.log(`\n  ⚠️ Quizzes que NO están en los subtemaIds buscados (${quizzesNoEncontrados.length}):`);
            quizzesNoEncontrados.slice(0, 10).forEach((q: any) => {
              console.log(`    - ${q.nombre} (subtema_id: ${q.subtema_id})`);
            });
            
            // Obtener información de estos subtemas para ver a qué materia pertenecen
            const subtemasNoBuscados = [...new Set(quizzesNoEncontrados.map((q: any) => q.subtema_id))];
            if (subtemasNoBuscados.length > 0) {
              const { data: subtemasInfo } = await supabaseAdmin
                .from('subtemas')
                .select('id, nombre, tema_id, temas!inner(periodo_id, periodos!inner(materia_id, materias!inner(nombre, curso_id)))')
                .in('id', subtemasNoBuscados.slice(0, 10));
              
              if (subtemasInfo && subtemasInfo.length > 0) {
                console.log('\n  📊 Información de estos subtemas:');
                subtemasInfo.forEach((s: any) => {
                  const materiaNombre = s.temas?.periodos?.materias?.nombre || 'N/A';
                  console.log(`    - Subtema "${s.nombre}" (${s.id}) -> Materia: ${materiaNombre}`);
                });
              }
            }
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
        const esIngles = materia.nombre.toLowerCase().includes('ingles') || materia.nombre.toLowerCase().includes('inglés');
        
        if (esIngles) {
          console.log(`\n🇬🇧 ===== PROCESANDO MATERIA INGLÉS =====`);
        } else {
          console.log(`\n🔍 Procesando materia: ${materia.nombre} (ID: ${materia.id})`);
        }
        console.log(`  Periodos de la materia:`, materia.periodos?.map((p: any) => `${p.nombre} (${p.id})`).join(', ') || 'ninguno');
        console.log(`  Total quizzes disponibles para filtrar: ${quizzes.length}`);
        
        // Mostrar todos los quizzes disponibles para inglés
        if (esIngles) {
          console.log(`\n  🔍 Todos los quizzes disponibles (${quizzes.length}):`);
          quizzes.forEach((q: any, index: number) => {
            const periodoNombre = q.subtemas?.temas?.periodos?.nombre || 'N/A';
            const materiaNombre = q.subtemas?.temas?.periodos?.materias?.nombre || 'N/A';
            const periodoId = q.subtemas?.temas?.periodo_id;
            console.log(`    ${index + 1}. "${q.nombre}"`);
            console.log(`       - Periodo: ${periodoNombre} (${periodoId || 'N/A'})`);
            console.log(`       - Materia: ${materiaNombre}`);
            console.log(`       - Estructura:`, {
              tiene_subtemas: !!q.subtemas,
              tiene_temas: !!q.subtemas?.temas,
              tiene_periodos: !!q.subtemas?.temas?.periodos,
              tiene_materias: !!q.subtemas?.temas?.periodos?.materias,
            });
          });
        }
        
        // Obtener quizzes de esta materia (a través de subtemas -> temas -> periodos -> materias)
        const quizzesMateria = quizzes.filter((q: any) => {
          // Debug: verificar estructura completa
          if (!q.subtemas || !q.subtemas.temas) {
            console.log(`    ⚠️ Quiz "${q.nombre}" no tiene subtemas o temas`);
            return false;
          }
          
          const periodoId = q.subtemas?.temas?.periodo_id;
          
          if (!periodoId) {
            console.log(`    ⚠️ Quiz "${q.nombre}" no tiene periodo_id`);
            return false;
          }
          
          // Obtener materiaId de dos formas posibles:
          // 1. Desde periodos.materias (si la relación anidada se cargó)
          const materiaIdFromRelation = q.subtemas?.temas?.periodos?.materias?.id;
          // 2. Desde periodos.materia_id (campo directo de la FK)
          const materiaIdFromFK = q.subtemas?.temas?.periodos?.materia_id;
          
          // Usar cualquiera de los dos que esté disponible
          const materiaId = materiaIdFromRelation || materiaIdFromFK;
          
          // Verificar que el periodo del quiz pertenece a esta materia
          const periodo = materia.periodos?.find((p: any) => p.id === periodoId);
          
          // Si el periodo está en esta materia, el quiz pertenece a esta materia
          // Esto es más confiable que depender de la relación anidada que puede no cargarse
          if (!periodo) {
            // Periodo no está en esta materia, definitivamente no pertenece
            if (esIngles) {
              console.log(`    ❌ Quiz "${q.nombre}" NO pertenece a inglés:`);
              console.log(`       - Periodo del quiz: ${periodoId || 'N/A'}`);
              console.log(`       - Periodos de inglés:`, materia.periodos?.map((p: any) => `${p.nombre} (${p.id})`).join(', ') || 'ninguno');
            }
            return false;
          }
          
          // Si hay materiaId disponible, verificar que coincida como validación adicional
          if (materiaId && materiaId !== materia.id) {
            if (esIngles) {
              console.log(`    ⚠️ Quiz "${q.nombre}" tiene periodo en materia pero materiaId no coincide:`, {
                materiaId_quiz: materiaId,
                materiaId_esperado: materia.id,
                periodoId_quiz: periodoId,
                periodo_nombre: periodo.nombre,
              });
            }
            // Aun así incluir el quiz porque el periodo pertenece a la materia
            // (podría ser un problema de carga de relaciones)
          }
          
          // Si llegamos aquí, el periodo pertenece a esta materia
          if (esIngles) {
            console.log(`    ✅ Quiz "${q.nombre}" SÍ pertenece a inglés - Periodo: "${periodo.nombre}"`);
          } else {
            console.log(`    ✅ Quiz "${q.nombre}" pertenece a materia "${materia.nombre}" y periodo "${periodo.nombre}"`);
          }
          return true;
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

