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

    // Obtener todos los cursos con información básica
    const { data, error } = await supabaseAdmin
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

    // Ordenar cursos por número de grado (de menor a mayor)
    const sortedData = (data || []).sort((a, b) => {
      // Extraer el número del nombre del curso (ej: "1 Grado" -> 1, "10 Grado" -> 10)
      const getGradoNumber = (nombre: string): number => {
        // Buscar el primer número en el nombre
        const match = nombre.match(/\b(\d+)\b/);
        if (match) {
          return parseInt(match[1], 10);
        }
        // Si no hay número, intentar extraer cualquier número
        const anyMatch = nombre.match(/(\d+)/);
        return anyMatch ? parseInt(anyMatch[1], 10) : 999; // Si no hay número, ponerlo al final
      };
      
      const gradoA = getGradoNumber(a.nombre);
      const gradoB = getGradoNumber(b.nombre);
      
      // Primero ordenar por número de grado
      if (gradoA !== gradoB) {
        return gradoA - gradoB;
      }
      
      // Si tienen el mismo número, ordenar por nivel (Primaria antes que Bachillerato)
      const nivelOrder: { [key: string]: number } = { 
        'Primaria': 1, 
        'Bachillerato': 2, 
        'Técnico': 3, 
        'Profesional': 4 
      };
      const nivelA = nivelOrder[a.nivel] || 99;
      const nivelB = nivelOrder[b.nivel] || 99;
      
      if (nivelA !== nivelB) {
        return nivelA - nivelB;
      }
      
      // Si tienen el mismo número y nivel, ordenar alfabéticamente por nombre
      return a.nombre.localeCompare(b.nombre);
    });

    return NextResponse.json(
      { data: sortedData },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en get-courses-for-select:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

