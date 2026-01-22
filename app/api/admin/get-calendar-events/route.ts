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

    // Verificar que el usuario es un super administrador
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

    // Obtener todos los cursos
    const { data: cursos, error: cursosError } = await supabaseAdmin
      .from('cursos')
      .select(`
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
      `);

    if (cursosError) {
      console.error('Error al obtener cursos:', cursosError);
      return NextResponse.json(
        { error: cursosError.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    const materiaIds = cursos?.flatMap((c: any) => 
      c.materias?.map((m: any) => m.id) || []
    ).filter(Boolean) || [];
    const periodoIds = cursos?.flatMap((c: any) => 
      c.materias?.flatMap((m: any) => 
        m.periodos?.map((p: any) => p.id) || []
      ) || []
    ).filter(Boolean) || [];

    // Obtener temas y subtemas para los quizzes
    const { data: temas, error: temasError } = await supabaseAdmin
      .from('temas')
      .select(`
        id,
        periodo_id,
        subtemas (
          id,
          nombre
        )
      `)
      .in('periodo_id', periodoIds);

    const subtemaIds = temas?.flatMap((t: any) => 
      t.subtemas?.map((s: any) => s.id) || []
    ).filter(Boolean) || [];

    // Obtener quizzes
    let quizzes: any[] = [];
    if (subtemaIds.length > 0) {
      const { data: quizzesData, error: quizzesError } = await supabaseAdmin
        .from('quizzes')
        .select(`
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
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
        .in('subtema_id', subtemaIds);

      if (!quizzesError && quizzesData) {
        quizzes = quizzesData.map((q: any) => ({
          id: q.id,
          title: q.nombre,
          type: 'quiz',
          start: q.fecha_inicio,
          end: q.fecha_fin,
          curso: q.subtemas?.temas?.periodos?.materias?.cursos?.nombre || 'N/A',
          materia: q.subtemas?.temas?.periodos?.materias?.nombre || 'N/A',
          periodo: q.subtemas?.temas?.periodos?.nombre || 'N/A',
          subtema: q.subtemas?.nombre || 'N/A',
        }));
      }
    }

    // Obtener evaluaciones
    let evaluaciones: any[] = [];
    if (periodoIds.length > 0 && materiaIds.length > 0) {
      const { data: evaluacionesData, error: evaluacionesError } = await supabaseAdmin
        .from('evaluaciones_periodo')
        .select(`
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
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
        .in('materia_id', materiaIds);

      if (!evaluacionesError && evaluacionesData) {
        evaluaciones = evaluacionesData.map((e: any) => ({
          id: e.id,
          title: e.nombre,
          type: 'evaluacion',
          start: e.fecha_inicio,
          end: e.fecha_fin,
          curso: e.materias?.cursos?.nombre || e.periodos?.materias?.cursos?.nombre || 'N/A',
          materia: e.materias?.nombre || 'N/A',
          periodo: e.periodos?.nombre || 'N/A',
        }));
      }
    }

    // Obtener periodos
    let periodos: any[] = [];
    if (periodoIds.length > 0) {
      const { data: periodosData, error: periodosError } = await supabaseAdmin
        .from('periodos')
        .select(`
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
        `)
        .in('id', periodoIds);

      if (!periodosError && periodosData) {
        periodos = periodosData.map((p: any) => ({
          id: p.id,
          title: p.nombre,
          type: 'periodo',
          start: p.fecha_inicio,
          end: p.fecha_fin,
          curso: p.materias?.cursos?.nombre || 'N/A',
          materia: p.materias?.nombre || 'N/A',
        }));
      }
    }

    // Combinar todos los eventos
    const eventos = [...periodos, ...quizzes, ...evaluaciones];

    return NextResponse.json({
      success: true,
      data: eventos,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en get-calendar-events:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}





