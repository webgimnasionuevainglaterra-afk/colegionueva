import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, confirmUserEmail } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SERVICE_ROLE_KEY no configurada. Agrega SUPABASE_SERVICE_ROLE_KEY a .env.local' },
        { status: 500 }
      );
    }

    const data = await confirmUserEmail(userId);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error al confirmar email' },
      { status: 500 }
    );
  }
}





