'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
import { loginSchema } from '@/domain/validation';
import type { ActionState } from '@/domain/models';
export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  if (!isConfigured()) return { error: 'Conecta Supabase en .env.local para iniciar sesión.' };
  const raw = Object.fromEntries(form);
  const identifier = String(raw.identifier ?? raw.email ?? '').trim();
  const result = loginSchema.safeParse({
    ...raw,
    email: `${identifier.toLowerCase()}@mkworld.local`,
  });
  if (!result.success) return { error: result.error.issues[0].message };
  try {
    const db = await createClient();
    const { data, error } = await db.auth.signInWithPassword(result.data);
    if (error)
      return {
        error: 'No se pudo iniciar sesión. Comprueba el usuario y la contraseña.',
      };
    const profile = await db
      .from('profiles')
      .select('access_enabled')
      .eq('id', data.user.id)
      .single();
    if (profile.error || !profile.data?.access_enabled) {
      await db.auth.signOut();
      return {
        error: 'Esta cuenta no tiene acceso de participante. Contacta con la administración.',
      };
    }
  } catch {
    return { error: 'No se pudo conectar con el servicio de cuentas. Inténtalo de nuevo.' };
  }
  redirect('/');
}
export async function signOut() {
  const db = await createClient();
  const { error } = await db.auth.signOut();
  if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
  redirect('/login');
}
