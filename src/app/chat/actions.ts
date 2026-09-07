'use server';
import { revalidatePath } from 'next/cache';
import { currentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
export async function sendMessage(
  _: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const profile = await currentProfile();
  if (!profile) return { error: 'Accede con tu cuenta de participante para escribir.' };
  const body = String(form.get('body') ?? '').trim();
  if (body.length < 1 || body.length > 500)
    return { error: 'Escribe un mensaje de entre 1 y 500 caracteres.' };
  const db = await createClient();
  const { error } = await db.from('chat_messages').insert({ user_id: profile.id, body });
  if (error) return { error: 'No se ha podido enviar el mensaje. Inténtalo de nuevo.' };
  revalidatePath('/chat');
  revalidatePath('/');
  return { success: 'Mensaje enviado.' };
}
