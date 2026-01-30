import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configurar tiempo máximo para subidas grandes (5 minutos)
export const maxDuration = 300;
export const runtime = 'nodejs';

// Tamaño máximo por archivo: 100MB (coincide con el límite del bucket en Supabase)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB en bytes

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

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron archivos' },
        { status: 400 }
      );
    }

    // Validar tipos de archivo permitidos
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

    const uploadedFiles = [];
    const invalidFiles: Array<{ name: string; reason: string }> = [];

    for (const file of files) {
      // Validar tamaño de archivo
      if (file.size > MAX_FILE_SIZE) {
        const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024;
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        invalidFiles.push({
          name: file.name,
          reason: `El archivo es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es ${maxSizeMB}MB.`
        });
        console.warn(`❌ Archivo ${file.name} excede el tamaño máximo: ${fileSizeMB}MB > ${maxSizeMB}MB`);
        continue;
      }

      // Validar tipo de archivo
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExt);
      
      if (!isValidType) {
        invalidFiles.push({
          name: file.name,
          reason: `Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG. Tipo detectado: ${file.type || 'desconocido'}`
        });
        console.warn(`❌ Archivo ${file.name} tiene tipo no permitido: ${file.type || fileExt}`);
        continue;
      }

      // Generar nombre único para el archivo
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
      const filePath = `contenido/${fileName}`;

      // Convertir File a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determinar content type
      let contentType = file.type;
      if (!contentType) {
        if (fileExt === '.pdf') contentType = 'application/pdf';
        else if (fileExt === '.jpg' || fileExt === '.jpeg') contentType = 'image/jpeg';
        else if (fileExt === '.png') contentType = 'image/png';
      }

      // Subir a Supabase Storage (bucket: contenido)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('contenido')
        .upload(filePath, buffer, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error al subir archivo:', uploadError);
        console.error('Detalles del error:', {
          message: uploadError.message,
          name: uploadError.name
        });
        
        // Si es un error crítico (bucket no existe, permisos), devolver error inmediatamente
        const errorMessage = uploadError.message || '';
        if (errorMessage.includes('Bucket not found') || 
            errorMessage.includes('bucket') ||
            errorMessage.includes('permission') ||
            errorMessage.includes('row-level security') ||
            errorMessage.includes('not found')) {
          return NextResponse.json(
            { 
              error: uploadError.message || 'Error al subir archivos. Verifica que el bucket "contenido" exista y tenga los permisos correctos en Supabase Storage.' 
            },
            { status: 500 }
          );
        }
        
        continue; // Continuar con el siguiente archivo para otros errores
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('contenido')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        name: file.name,
        url: publicUrl,
        path: filePath,
        type: file.type || contentType,
      });
    }

    if (uploadedFiles.length === 0) {
      // Si hay archivos inválidos, reportarlos
      if (invalidFiles.length > 0) {
        return NextResponse.json(
          { 
            error: 'No se pudieron subir los archivos',
            invalidFiles: invalidFiles,
            message: `${invalidFiles.length} archivo(s) no válido(s). Ver detalles en invalidFiles.`
          },
          { status: 400 }
        );
      }

      // Verificar si el bucket existe
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      let bucketExists = false;
      
      if (!bucketsError && buckets) {
        bucketExists = buckets.some(b => b.id === 'contenido');
      }
      
      let errorMessage = 'No se pudieron subir los archivos. ';
      if (!bucketExists) {
        errorMessage += 'El bucket "contenido" no existe en Supabase Storage. Por favor, créalo desde el dashboard de Supabase.';
      } else {
        errorMessage += 'Asegúrate de que los archivos sean PDF, JPG o PNG y que no excedan el tamaño máximo de 100MB.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Si algunos archivos se subieron pero otros no, reportar los inválidos
    if (invalidFiles.length > 0) {
      console.warn(`⚠️ Se subieron ${uploadedFiles.length} archivo(s) pero ${invalidFiles.length} archivo(s) fueron rechazados:`, invalidFiles);
    }

    // Extraer solo las URLs para compatibilidad
    const urls = uploadedFiles.map(file => file.url);

    console.log('✅ Archivos subidos exitosamente:', {
      count: uploadedFiles.length,
      files: uploadedFiles,
      urls: urls
    });

    return NextResponse.json(
      { 
        success: true, 
        files: uploadedFiles,
        urls: urls, // También devolver urls directamente para compatibilidad
        invalidFiles: invalidFiles.length > 0 ? invalidFiles : undefined, // Incluir archivos inválidos si los hay
        warnings: invalidFiles.length > 0 ? `${invalidFiles.length} archivo(s) fueron rechazados` : undefined
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en upload-files:', error);
    console.error('Stack trace:', error.stack);
    
    // Mensaje de error más descriptivo
    let errorMessage = error.message || 'Error interno del servidor al subir archivos';
    
    // Mensajes específicos para errores comunes
    if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
      errorMessage = 'El bucket "contenido" no existe en Supabase Storage. Por favor, créalo desde el dashboard de Supabase.';
    } else if (error.message?.includes('permission') || error.message?.includes('row-level security')) {
      errorMessage = 'Error de permisos. Verifica las políticas RLS del bucket "contenido" en Supabase Storage.';
    } else if (error.message?.includes('File size') || error.message?.includes('too large') || error.message?.includes('413')) {
      errorMessage = `El archivo es demasiado grande. El tamaño máximo permitido es ${MAX_FILE_SIZE / 1024 / 1024}MB por archivo.`;
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = 'La subida del archivo tardó demasiado tiempo. Intenta con un archivo más pequeño o verifica tu conexión a internet.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

