import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Importación dinámica para evitar problemas con Turbopack
const XLSX = require('xlsx');

// Configurar el tamaño máximo del body (100MB)
export const maxDuration = 300; // 5 minutos
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const archivo = formData.get('archivo') as File;
    const periodo_id = formData.get('periodo_id') as string;

    console.log('Iniciando importación de contenidos...');
    console.log('Archivo:', archivo?.name, 'Tamaño:', archivo?.size, 'bytes');
    console.log('Periodo ID:', periodo_id);

    if (!archivo) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (!periodo_id) {
      return NextResponse.json(
        { error: 'periodo_id es requerido' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Leer el archivo Excel
    console.log('Leyendo archivo Excel...');
    const arrayBuffer = await archivo.arrayBuffer();
    console.log('Archivo leído, tamaño:', arrayBuffer.byteLength, 'bytes');
    
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const datos = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log('Datos leídos del Excel:', datos.length, 'filas');

    if (datos.length === 0) {
      return NextResponse.json(
        { error: 'El archivo está vacío' },
        { status: 400 }
      );
    }

    // Función auxiliar para verificar si una fila debe ser ignorada
    const esFilaValida = (fila: any): boolean => {
      const temaNombre = (fila.Tema || fila.tema || '').toString().trim();
      const subtemaNombre = (fila.Subtema || fila.subtema || '').toString().trim();
      const titulo = (fila.Título || fila.Titulo || fila.titulo || '').toString().trim();
      
      // Ignorar filas completamente vacías
      if (!temaNombre && !subtemaNombre && !titulo) {
        return false;
      }
      
      // Ignorar filas con valores de plantilla
      const valoresPlantilla = [
        'nombre del tema',
        'nombre del subtema',
        'título del contenido',
        'descripción (opcional)',
        'nombre del contenido'
      ];
      
      const temaLower = temaNombre.toLowerCase();
      const subtemaLower = subtemaNombre.toLowerCase();
      const tituloLower = titulo.toLowerCase();
      
      if (valoresPlantilla.includes(temaLower) || 
          valoresPlantilla.includes(subtemaLower) || 
          valoresPlantilla.includes(tituloLower)) {
        return false;
      }
      
      return true;
    };

    // Verificar que haya al menos una fila válida
    const tieneFilasValidas = datos.some(esFilaValida);
    if (!tieneFilasValidas) {
      return NextResponse.json(
        { error: 'No se encontraron datos válidos en el archivo (todas las filas están vacías o contienen valores de plantilla)' },
        { status: 400 }
      );
    }

    // Obtener temas del periodo
    console.log('Obteniendo temas del periodo...');
    const { data: temas, error: temasError } = await supabaseAdmin
      .from('temas')
      .select('id, nombre')
      .eq('periodo_id', periodo_id);

    if (temasError) {
      console.error('Error al obtener temas:', temasError);
      return NextResponse.json(
        { error: 'Error al obtener temas: ' + temasError.message },
        { status: 500 }
      );
    }

    console.log('Temas encontrados:', temas?.length || 0);
    const temasMap = new Map(temas?.map(t => [t.nombre.toLowerCase().trim(), t.id]) || []);

    const contenidosCreados: any[] = [];
    const errores: string[] = [];

    // Procesar todas las filas pero saltar las que tienen valores de plantilla
    // Esto mantiene el número de fila correcto en los mensajes de error
    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i];
      
      // Saltar filas inválidas (vacías o con valores de plantilla)
      if (!esFilaValida(fila)) {
        continue;
      }
      try {
        // Normalizar nombres de columnas (case-insensitive)
        const temaNombre = (fila.Tema || fila.tema || '').toString().trim();
        const subtemaNombre = (fila.Subtema || fila.subtema || '').toString().trim();
        const tipo = (fila.Tipo || fila.tipo || '').toString().toLowerCase().trim();
        const titulo = (fila.Título || fila.Titulo || fila.titulo || '').toString().trim();
        const descripcion = (fila.Descripción || fila.Descripcion || fila.descripcion || '').toString().trim();
        const urlVideo = (fila.URL_Video || fila.url_video || fila.URL || fila.url || '').toString().trim();
        // URL_Archivo ya no se usa - los archivos se suben directamente desde el subtema

        // Validar campos requeridos
        if (!temaNombre || !subtemaNombre || !tipo || !titulo) {
          errores.push(`Fila ${i + 2}: Faltan campos requeridos (Tema, Subtema, Tipo, Título)`);
          continue;
        }

        if (!['video', 'archivo', 'foro'].includes(tipo)) {
          errores.push(`Fila ${i + 2}: Tipo debe ser 'video', 'archivo' o 'foro'`);
          continue;
        }

        // Buscar tema (búsqueda case-insensitive y sin espacios extra)
        const temaNombreNormalizado = temaNombre.toLowerCase().trim();
        let temaId = temasMap.get(temaNombreNormalizado);
        
        // Si no encuentra, intentar búsqueda más flexible (ignorar espacios múltiples)
        if (!temaId) {
          for (const [nombreTema, id] of temasMap.entries()) {
            const nombreNormalizado = nombreTema.replace(/\s+/g, ' ').trim();
            const temaBusquedaNormalizado = temaNombreNormalizado.replace(/\s+/g, ' ').trim();
            if (nombreNormalizado === temaBusquedaNormalizado) {
              temaId = id;
              break;
            }
          }
        }
        
        if (!temaId) {
          // Agregar información de debug: mostrar temas disponibles
          const temasDisponibles = Array.from(temasMap.keys()).join(', ');
          errores.push(`Fila ${i + 2}: Tema "${temaNombre}" no encontrado en este periodo. Temas disponibles: ${temasDisponibles || 'ninguno'}`);
          continue;
        }

        // Buscar subtema (búsqueda exacta primero, luego case-insensitive)
        const { data: subtemas, error: subtemasError } = await supabaseAdmin
          .from('subtemas')
          .select('id, orden')
          .eq('tema_id', temaId)
          .eq('nombre', subtemaNombre)
          .limit(1);
        
        let subtemasResult = subtemas;
        // Si no encuentra con búsqueda exacta, intentar case-insensitive
        if ((!subtemasResult || subtemasResult.length === 0) && subtemasError === null) {
          const { data: subtemasIlike } = await supabaseAdmin
            .from('subtemas')
            .select('id, orden')
            .eq('tema_id', temaId)
            .ilike('nombre', subtemaNombre)
            .limit(1);
          subtemasResult = subtemasIlike;
        }

        let subtemaId: string | null = null;

        if (subtemasError) {
          errores.push(`Fila ${i + 2}: Error al buscar subtemas para el tema "${temaNombre}" - ${subtemasError.message}`);
          continue;
        }

        if (!subtemasResult || subtemasResult.length === 0) {
          // Si no existe el subtema, crearlo automáticamente para este tema
          try {
            // Obtener el máximo orden actual para este tema
            const { data: existingSubtemas } = await supabaseAdmin
              .from('subtemas')
              .select('orden')
              .eq('tema_id', temaId)
              .order('orden', { ascending: false })
              .limit(1);

            const nextOrdenSubtema = (existingSubtemas?.[0]?.orden ?? -1) + 1;

            const { data: nuevoSubtema, error: nuevoSubtemaError } = await supabaseAdmin
              .from('subtemas')
              .insert({
                tema_id: temaId,
                nombre: subtemaNombre,
                descripcion: null,
                orden: nextOrdenSubtema,
              })
              .select('id')
              .single();

            if (nuevoSubtemaError || !nuevoSubtema) {
              errores.push(
                `Fila ${i + 2}: No se pudo crear el subtema "${subtemaNombre}" para el tema "${temaNombre}" - ${
                  nuevoSubtemaError?.message || 'Error desconocido'
                }`
              );
              continue;
            }

            subtemaId = nuevoSubtema.id;
          } catch (crearSubtemaError: any) {
            errores.push(
              `Fila ${i + 2}: Error al crear automáticamente el subtema "${subtemaNombre}" para el tema "${temaNombre}" - ${
                crearSubtemaError.message || 'Error desconocido'
              }`
            );
            continue;
          }
        } else {
          subtemaId = subtemasResult[0].id;
        }

        if (!subtemaId) {
          errores.push(`Fila ${i + 2}: No se pudo obtener o crear el subtema "${subtemaNombre}" para el tema "${temaNombre}"`);
          continue;
        }

        // Validar que tenga URL de video solo para tipo video
        // Para tipo 'archivo', los archivos se suben directamente desde el subtema, no desde el Excel
        if (tipo === 'video' && !urlVideo) {
          errores.push(`Fila ${i + 2}: Tipo 'video' requiere URL_Video`);
          continue;
        }

        // Para tipo 'archivo' y 'foro', no se requieren URLs en el Excel
        // Los archivos se suben directamente desde la interfaz del subtema

        // Obtener el máximo orden actual para este subtema
        const { data: existingContenido } = await supabaseAdmin
          .from('contenido')
          .select('orden')
          .eq('subtema_id', subtemaId)
          .order('orden', { ascending: false })
          .limit(1);

        const nextOrden = (existingContenido?.[0]?.orden ?? -1) + 1;

        // Preparar datos según el tipo
        let url: string | null = null;
        let archivo_url: string | null = null;

        if (tipo === 'video') {
          url = urlVideo || null;
          // archivo_url se deja null - los archivos se suben desde el subtema
        } else if (tipo === 'archivo') {
          // Para tipo 'archivo', no se usa URL_Archivo del Excel
          // Los archivos se suben directamente desde la interfaz del subtema
          archivo_url = null;
        } else if (tipo === 'foro') {
          // Para foro, no se requieren URLs
        }

        // Crear contenido
        const { data: contenidoCreado, error: contenidoError } = await supabaseAdmin
          .from('contenido')
          .insert({
            subtema_id: subtemaId,
            tipo: tipo as 'video' | 'archivo' | 'foro',
            titulo,
            descripcion: descripcion || null,
            url,
            archivo_url,
            orden: nextOrden,
          })
          .select()
          .single();

        if (contenidoError) {
          errores.push(`Fila ${i + 2}: Error al crear contenido - ${contenidoError.message}`);
          continue;
        }

        contenidosCreados.push(contenidoCreado);
      } catch (err: any) {
        errores.push(`Fila ${i + 2}: ${err.message || 'Error desconocido'}`);
      }
    }

    console.log('Importación completada. Creados:', contenidosCreados.length, 'Errores:', errores.length);

    return NextResponse.json({
      success: true,
      totalCreados: contenidosCreados.length,
      totalErrores: errores.length,
      errores: errores.length > 0 ? errores : undefined,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error en importar-contenidos:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

