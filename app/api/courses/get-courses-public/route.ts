import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Obtener todos los cursos activos, solo con información básica
    const { data: cursos, error } = await supabaseAdmin
      .from('cursos')
      .select('id, nombre, nivel')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener cursos:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener los cursos' },
        { status: 500 }
      );
    }

    // Organizar cursos por nivel
    const cursosPorNivel: { [key: string]: any[] } = {
      'Primaria': [],
      'Bachillerato': [],
      'Técnico': [],
    };

    (cursos || []).forEach((curso) => {
      const nivel = curso.nivel || 'Otro';
      if (cursosPorNivel[nivel]) {
        cursosPorNivel[nivel].push(curso);
      }
    });

    // Ordenar cursos dentro de cada nivel por número de grado
    Object.keys(cursosPorNivel).forEach((nivel) => {
      cursosPorNivel[nivel].sort((a, b) => {
        // Extraer el número del nombre del curso (ej: "1 Grado" -> 1, "10 Grado" -> 10)
        const getGradoNumber = (nombre: string): number => {
          const match = nombre.match(/\b(\d+)\b/);
          if (match) {
            return parseInt(match[1], 10);
          }
          const anyMatch = nombre.match(/(\d+)/);
          return anyMatch ? parseInt(anyMatch[1], 10) : 999;
        };
        
        return getGradoNumber(a.nombre) - getGradoNumber(b.nombre);
      });
    });

    return NextResponse.json({
      success: true,
      cursosPorNivel,
    });
  } catch (error: any) {
    console.error('Error en get-courses-public:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

