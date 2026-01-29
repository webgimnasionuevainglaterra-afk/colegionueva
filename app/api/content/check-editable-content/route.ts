import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Ruta de diagnóstico para verificar el estado de la tabla editable_content
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado',
          tableExists: false,
          canRead: false,
          canWrite: false
        },
        { status: 500 }
      );
    }

    // Intentar leer de la tabla
    const { data: readData, error: readError } = await supabaseAdmin
      .from('editable_content')
      .select('*')
      .limit(1);

    const canRead = !readError;
    let tableExists = true;
    let errorMessage = null;

    if (readError) {
      // Si la tabla no existe, el error será 42P01
      if (readError.code === '42P01' || readError.message?.includes('does not exist')) {
        tableExists = false;
        errorMessage = 'La tabla editable_content no existe. Ejecuta el script SQL: supabase/create_editable_content_table.sql';
      } else {
        errorMessage = readError.message;
      }
    }

    // Intentar escribir en la tabla (solo si existe)
    let canWrite = false;
    if (tableExists) {
      const testKey = `__test_${Date.now()}`;
      const { error: writeError } = await supabaseAdmin
        .from('editable_content')
        .upsert({
          key: testKey,
          type: 'text',
          content: 'test',
        }, {
          onConflict: 'key',
        });

      canWrite = !writeError;

      // Limpiar el registro de prueba
      if (canWrite) {
        await supabaseAdmin
          .from('editable_content')
          .delete()
          .eq('key', testKey);
      }

      if (writeError) {
        errorMessage = writeError.message;
      }
    }

    // Obtener conteo de registros
    let recordCount = 0;
    if (tableExists && canRead) {
      const { count } = await supabaseAdmin
        .from('editable_content')
        .select('*', { count: 'exact', head: true });
      recordCount = count || 0;
    }

    return NextResponse.json({
      success: tableExists && canRead && canWrite,
      tableExists,
      canRead,
      canWrite,
      recordCount,
      error: errorMessage,
      message: tableExists && canRead && canWrite 
        ? '✅ La tabla editable_content está funcionando correctamente'
        : '❌ Hay problemas con la tabla editable_content. Verifica los detalles arriba.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        tableExists: false,
        canRead: false,
        canWrite: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}

