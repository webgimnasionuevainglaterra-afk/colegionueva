import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Función para generar UUID sin dependencias externas
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    console.log('📤 Iniciando upload de foto...');
    
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurado');
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    console.log('✅ Supabase admin cliente creado correctamente');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No se proporcionó archivo');
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    console.log('📁 Archivo recibido:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      console.error('❌ El archivo no es una imagen:', file.type);
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${generateUUID()}.${fileExt}`;
    const filePath = `estudiantes/${fileName}`;

    console.log('📝 Preparando subida:', {
      fileName,
      filePath,
      contentType: file.type
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('💾 Buffer creado, tamaño:', buffer.length, 'bytes');

    console.log('⬆️ Subiendo a Supabase Storage...');
    console.log('Bucket: fotos, Path:', filePath);
    
    // Verificar que el bucket existe
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) {
      console.error('❌ Error al listar buckets:', bucketsError);
    } else {
      const fotosBucket = buckets?.find(b => b.id === 'fotos');
      if (!fotosBucket) {
        console.error('❌ El bucket "fotos" no existe');
        return NextResponse.json(
          { error: 'El bucket "fotos" no existe en Supabase Storage. Por favor, créalo desde el dashboard de Supabase.' },
          { status: 500 }
        );
      }
      console.log('✅ Bucket "fotos" encontrado:', fotosBucket);
    }

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('fotos')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error al subir foto a Supabase:', uploadError);
      console.error('Detalles del error:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error,
        name: uploadError.name
      });
      
      // Mensaje de error más descriptivo
      let errorMessage = uploadError.message || 'Error al subir la foto';
      if (uploadError.message?.includes('Bucket not found')) {
        errorMessage = 'El bucket "fotos" no existe. Por favor, créalo desde el dashboard de Supabase Storage.';
      } else if (uploadError.message?.includes('new row violates row-level security')) {
        errorMessage = 'Error de permisos. Verifica las políticas RLS del bucket "fotos" en Supabase.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    console.log('✅ Foto subida exitosamente a Supabase Storage');

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('fotos')
      .getPublicUrl(filePath);

    console.log('🔗 URL pública generada:', publicUrl);

    return NextResponse.json(
      { url: publicUrl },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error en upload-foto (catch):', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

