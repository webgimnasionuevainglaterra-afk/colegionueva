import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Importación dinámica para evitar problemas con Turbopack
const XLSX = require('xlsx');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const temaNombreParam = searchParams.get('tema') || '';
    const temaId = searchParams.get('tema_id') || '';
    const subtemasParam = searchParams.get('subtemas') || '';
    
    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    
    let datosEjemplo: any[] = [];
    let temaNombre = temaNombreParam;
    
    // Si hay tema_id, obtener el tema desde la base de datos para asegurar el nombre correcto
    if (temaId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Obtener el tema desde la base de datos para asegurar que usamos el nombre correcto
        const { data: temaData, error: temaError } = await supabaseAdmin
          .from('temas')
          .select('nombre')
          .eq('id', temaId)
          .single();
        
        // Si se encuentra el tema, usar su nombre (más confiable que el parámetro)
        if (!temaError && temaData) {
          temaNombre = temaData.nombre;
        }
        
        // Buscar subtemas existentes del tema
        const { data: subtemas, error: subtemasError } = await supabaseAdmin
          .from('subtemas')
          .select('nombre')
          .eq('tema_id', temaId)
          .order('orden', { ascending: true });
        
        if (!subtemasError && subtemas && subtemas.length > 0) {
          // Prellenar con los subtemas existentes
          for (const subtema of subtemas) {
            // Agregar un ejemplo de cada tipo para cada subtema
            datosEjemplo.push({
              'Tema': temaNombre || 'Nombre del Tema',
              'Subtema': subtema.nombre,
              'Tipo': 'video',
              'Título': 'Título del Contenido',
              'Descripción': 'Descripción (opcional)',
              'URL_Video': 'https://www.youtube.com/watch?v=ejemplo'
            });
            datosEjemplo.push({
              'Tema': temaNombre || 'Nombre del Tema',
              'Subtema': subtema.nombre,
              'Tipo': 'archivo',
              'Título': 'Título del Contenido',
              'Descripción': 'Descripción (opcional)',
              'URL_Video': ''
            });
            datosEjemplo.push({
              'Tema': temaNombre || 'Nombre del Tema',
              'Subtema': subtema.nombre,
              'Tipo': 'foro',
              'Título': 'Título del Contenido',
              'Descripción': 'Descripción (opcional)',
              'URL_Video': ''
            });
          }
        } else {
          // Si no hay subtemas, crear ejemplos con el tema prellenado
          datosEjemplo = [
            {
              'Tema': temaNombre || 'Nombre del Tema',
              'Subtema': 'Nombre del Subtema',
              'Tipo': 'video',
              'Título': 'Título del Contenido',
              'Descripción': 'Descripción (opcional)',
              'URL_Video': 'https://www.youtube.com/watch?v=ejemplo'
            },
            {
              'Tema': temaNombre || 'Nombre del Tema',
              'Subtema': 'Nombre del Subtema',
              'Tipo': 'archivo',
              'Título': 'Título del Contenido',
              'Descripción': 'Descripción (opcional)',
              'URL_Video': ''
            },
            {
              'Tema': temaNombre || 'Nombre del Tema',
              'Subtema': 'Nombre del Subtema',
              'Tipo': 'foro',
              'Título': 'Título del Contenido',
              'Descripción': 'Descripción (opcional)',
              'URL_Video': ''
            }
          ];
        }
      } catch (error) {
        console.error('Error al obtener subtemas:', error);
        // Si hay error, usar datos de ejemplo básicos
        datosEjemplo = [
          {
            'Tema': temaNombre || 'Nombre del Tema',
            'Subtema': 'Nombre del Subtema',
            'Tipo': 'video',
            'Título': 'Título del Contenido',
            'Descripción': 'Descripción (opcional)',
            'URL_Video': 'https://www.youtube.com/watch?v=ejemplo'
          },
          {
            'Tema': temaNombre || 'Nombre del Tema',
            'Subtema': 'Nombre del Subtema',
            'Tipo': 'archivo',
            'Título': 'Título del Contenido',
            'Descripción': 'Descripción (opcional)',
            'URL_Video': ''
          },
          {
            'Tema': temaNombre || 'Nombre del Tema',
            'Subtema': 'Nombre del Subtema',
            'Tipo': 'foro',
            'Título': 'Título del Contenido',
            'Descripción': 'Descripción (opcional)',
            'URL_Video': ''
          }
        ];
      }
    } else {
      // Si no hay tema_id, usar datos de ejemplo básicos
      datosEjemplo = [
        {
          'Tema': temaNombre || 'Nombre del Tema',
          'Subtema': 'Nombre del Subtema',
          'Tipo': 'video',
          'Título': 'Título del Contenido',
          'Descripción': 'Descripción (opcional)',
          'URL_Video': 'https://www.youtube.com/watch?v=ejemplo'
        },
        {
          'Tema': temaNombre || 'Nombre del Tema',
          'Subtema': 'Nombre del Subtema',
          'Tipo': 'archivo',
          'Título': 'Título del Contenido',
          'Descripción': 'Descripción (opcional)',
          'URL_Video': ''
        },
        {
          'Tema': temaNombre || 'Nombre del Tema',
          'Subtema': 'Nombre del Subtema',
          'Tipo': 'foro',
          'Título': 'Título del Contenido',
          'Descripción': 'Descripción (opcional)',
          'URL_Video': ''
        }
      ];
    }
    
    // Convertir datos a worksheet
    const worksheet = XLSX.utils.json_to_sheet(datosEjemplo);
    
    // Ajustar anchos de columna
    worksheet['!cols'] = [
      { wch: 25 }, // Tema
      { wch: 25 }, // Subtema
      { wch: 15 }, // Tipo
      { wch: 30 }, // Título
      { wch: 40 }, // Descripción
      { wch: 50 }  // URL_Video
    ];
    
    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contenidos');
    
    // Generar buffer del Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Retornar el archivo
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="plantilla_contenidos.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error al generar plantilla:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la plantilla' },
      { status: 500 }
    );
  }
}

