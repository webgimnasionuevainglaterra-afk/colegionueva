import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Archivo no proporcionado' },
        { status: 400 }
      );
    }

    if (!key) {
      return NextResponse.json(
        { error: 'Key no proporcionada' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no debe superar los 5MB' },
        { status: 400 }
      );
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${key}-${Date.now()}.${fileExt}`;
    const filePath = `editable-content/${fileName}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('contenido')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error al subir imagen:', uploadError);
      return NextResponse.json(
        { error: 'Error al subir la imagen', details: uploadError.message },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('contenido')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Error en upload-editable-image:', error);
    return NextResponse.json(
      { error: 'Error al subir la imagen', details: error.message },
      { status: 500 }
    );
  }
}





