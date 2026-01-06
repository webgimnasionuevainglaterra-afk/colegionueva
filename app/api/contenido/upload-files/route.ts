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

    for (const file of files) {
      // Validar tipo de archivo
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExt);
      
      if (!isValidType) {
        continue; // Saltar archivos no válidos
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
        continue; // Continuar con el siguiente archivo
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
      return NextResponse.json(
        { error: 'No se pudieron subir los archivos. Asegúrate de que sean PDF, JPG o PNG' },
        { status: 400 }
      );
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
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en upload-files:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

