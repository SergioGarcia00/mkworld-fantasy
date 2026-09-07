import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth';
// Authorization precedes construction of a privileged client. Never import in client code.
export async function operatorClient() {
  await requireAdmin();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta configurar la clave de administración en el servidor.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
