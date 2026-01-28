import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body; // Array de { id, orden }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items debe ser un array con al menos un elemento' },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    // Actualizar el orden de cada item
    const updatePromises = items.map((item: { id: string; orden: number }) =>
      supabaseAdmin
        .from('contenido')
        .update({ orden: item.orden })
        .eq('id', item.id)
    );

    const results = await Promise.all(updatePromises);

    // Verificar si hubo errores
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error al actualizar orden:', errors);
      return NextResponse.json(
        { error: 'Error al actualizar el orden de algunos elementos' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Orden actualizado correctamente' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en update-orden:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}










