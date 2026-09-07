import { createClient } from '@supabase/supabase-js';
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      'Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.',
    );
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
