import { NextRequest, NextResponse } from 'next/server';

// Importación dinámica para evitar problemas con Turbopack
const XLSX = require('xlsx');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const temaNombre = searchParams.get('tema') || '';
    
    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    
    // Crear datos de ejemplo
    const datosEjemplo = [
      {
        'Tema': temaNombre || 'Nombre del Tema',
        'Subtema': 'Nombre del Subtema',
        'Tipo': 'video',
        'Título': 'Título del Contenido',
        'Descripción': 'Descripción (opcional)',
        'URL_Video': 'https://www.youtube.com/watch?v=ejemplo',
        'URL_Archivo': ''
      },
      {
        'Tema': temaNombre || 'Nombre del Tema',
        'Subtema': 'Nombre del Subtema',
        'Tipo': 'archivo',
        'Título': 'Título del Contenido',
        'Descripción': 'Descripción (opcional)',
        'URL_Video': '',
        'URL_Archivo': 'https://ejemplo.com/archivo.pdf'
      }
    ];
    
    // Convertir datos a worksheet
    const worksheet = XLSX.utils.json_to_sheet(datosEjemplo);
    
    // Ajustar anchos de columna
    worksheet['!cols'] = [
      { wch: 25 }, // Tema
      { wch: 25 }, // Subtema
      { wch: 15 }, // Tipo
      { wch: 30 }, // Título
      { wch: 40 }, // Descripción
      { wch: 50 }, // URL_Video
      { wch: 50 }  // URL_Archivo
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

