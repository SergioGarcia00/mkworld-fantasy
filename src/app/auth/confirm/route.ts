import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  if (token && (type === 'signup' || type === 'email')) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({ token_hash: token, type });
    if (!error) return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.redirect(new URL('/login?confirmation=error', request.url));
}
