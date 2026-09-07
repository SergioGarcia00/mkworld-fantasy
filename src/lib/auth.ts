import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isConfigured } from '@/lib/supabase/env';
export const currentProfile = cache(async () => {
  if (!isConfigured()) return null;
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
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
