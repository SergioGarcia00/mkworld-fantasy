import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
export const currentProfile = cache(async () => {
  if (!isConfigured()) return null;
  const db = await createClient();
  const authResult = await Promise.race([
    db.auth.getUser(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('auth-timeout')), 3500)),
  ]).catch(() => ({ data: { user: null }, error: new Error('auth-unavailable') }));
  const { data: { user }, error } = authResult;
  if (error || !user) return null;
  const { data, error: profileError } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) throw new Error('No se pudo cargar el perfil. Comprueba las migraciones.');
  return data.access_enabled ? data : null;
});
export async function requireAdmin() {
  const profile = await currentProfile();
  if (profile?.role !== 'ADMIN') throw new Error('Acceso reservado a administradores.');
  return profile;
}
