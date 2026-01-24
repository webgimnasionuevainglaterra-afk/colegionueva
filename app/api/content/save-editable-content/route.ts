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

    const { key, type, content } = await request.json();

    if (!key || !type || content === undefined) {
      return NextResponse.json(
        { error: 'key, type y content son requeridos' },
        { status: 400 }
      );
    }

    // Insertar o actualizar el contenido editable
    const { data, error } = await supabaseAdmin
      .from('editable_content')
      .upsert(
        {
          key,
          type,
          content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'key',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error al guardar contenido:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      
      // Si la tabla no existe, dar un mensaje más claro
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'La tabla editable_content no existe. Por favor ejecute el script SQL create_editable_content_table.sql en Supabase.',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }
      
      // Si es un error de permisos RLS
      if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
        return NextResponse.json(
          { 
            error: 'Error de permisos. Por favor verifique las políticas RLS de la tabla editable_content.',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error al guardar el contenido', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error en save-editable-content:', error);
    return NextResponse.json(
      { error: 'Error al guardar el contenido', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no está configurado' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // Obtener un contenido específico
      const { data, error } = await supabaseAdmin
        .from('editable_content')
        .select('*')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json(
          { error: 'Error al obtener el contenido', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data || null,
      });
    } else {
      // Obtener todo el contenido
      const { data, error } = await supabaseAdmin
        .from('editable_content')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Error al obtener el contenido', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data,
      });
    }
  } catch (error: any) {
    console.error('Error en get-editable-content:', error);
    return NextResponse.json(
      { error: 'Error al obtener el contenido', details: error.message },
      { status: 500 }
    );
  }
}

