/* Dynamic Supabase relations are checked by PostgreSQL; the inherited client schema only covers core tables. */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { operatorClient } from '@/lib/supabase/operator';
import { requireAdmin, currentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signupSchema, nameSchema } from '@/domain/validation';
import type { ActionState } from '@/domain/models';
function errorState(error: unknown): ActionState {
  return {
    error:
      error instanceof z.ZodError
        ? error.issues[0].message
        : error instanceof Error
          ? error.message
          : 'No se pudo completar la operación.',
  };
}
export async function createParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const db = await operatorClient();
    const raw = Object.fromEntries(form);
    const username = z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Za-z0-9_]+$/)
      .parse(raw.username);
    const values = signupSchema.parse({ ...raw, email: `${username.toLowerCase()}@mkworld.local` });
    const { error } = await db.auth.admin.createUser({
      email: values.email,
      password: values.password,
      email_confirm: true,
      app_metadata: { managed_account: true },
      user_metadata: { display_name: values.displayName },
    });
    if (error)
      return {
        error:
          'No se pudo crear la cuenta. Comprueba si ese usuario ya existe y que las migraciones estén aplicadas.',
      };
    revalidatePath('/admin');
    return {
      success: `Cuenta de ${values.displayName} creada. Entrega sus credenciales por un canal privado.`,
    };
  } catch (error) {
    return errorState(error);
  }
}
export async function setAccess(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = z.uuid().parse(form.get('id'));
    const enabled = z.enum(['true', 'false']).parse(form.get('enabled')) === 'true';
    const { error } = await (
      await createClient()
    ).rpc('set_participant_access', { target_user: id, enabled });
    if (error) throw new Error('No se pudo cambiar el acceso del participante.');
    revalidatePath('/', 'layout');
    return {
      success: enabled ? 'Acceso habilitado.' : 'Acceso deshabilitado. Su historial se conserva.',
    };
  } catch (error) {
    return errorState(error);
  }
}
export async function setPublication(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = z.uuid().parse(form.get('id'));
    const published = z.enum(['true', 'false']).parse(form.get('published')) === 'true';
    const { error } = await (
      await createClient()
    ).rpc('set_league_publication', { target_league: id, published });
    if (error) throw new Error('No se pudo cambiar la visibilidad de la liga.');
    revalidatePath('/', 'layout');
    return {
      success: published ? 'Liga visible para espectadores.' : 'Liga retirada de la zona pública.',
    };
  } catch (error) {
    return errorState(error);
  }
}
export async function setMatchdayStatus(form: FormData) {
  await requireAdmin();
  const db: any = await createClient();
  const { error } = await db.rpc('admin_set_matchday_status', {
    target_matchday: z.uuid().parse(form.get('id')),
    new_status: z.enum(['OPEN', 'LOCKED', 'FINISHED']).parse(form.get('status')),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
}
export async function startTestMatchday(form: FormData) {
  await requireAdmin();
  const db: any = await createClient();
  const { error } = await db.rpc('admin_start_test_matchday', {
    target_matchday: z.uuid().parse(form.get('id')),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}
export async function notifyParticipants(form: FormData) {
  await requireAdmin();
  const db: any = await operatorClient();
  const { error } = await db.rpc('notify_all', {
    title_text: z.string().trim().min(1).max(140).parse(form.get('title')),
    body_text: z.string().trim().min(1).max(500).parse(form.get('body')),
    kind_text: z.enum(['INFO', 'MARKET', 'LINEUP', 'RESULT']).parse(form.get('kind')),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/notifications');
}
export async function createNews(form: FormData) {
  await requireAdmin();
  const db: any = await createClient();
  const profile = await currentProfile();
  const { error } = await db.from('news_posts').insert({
    title: z.string().trim().min(1).max(140).parse(form.get('title')),
    body: z.string().trim().min(1).max(10000).parse(form.get('body')),
    category: z.enum(['Competición', 'Mercado', 'Resultados', 'Aviso']).parse(form.get('category')),
    published: form.get('published') === 'on',
    author_id: profile?.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath('/admin');
}
export async function deleteChatMessage(form: FormData) {
  await requireAdmin();
  const db: any = await createClient();
  const { error } = await db
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', z.uuid().parse(form.get('id')));
  if (error) throw new Error(error.message);
  revalidatePath('/admin');
  revalidatePath('/chat');
  revalidatePath('/');
}
export async function initializeOfficialLeague(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    const name = nameSchema.pipe(z.string().max(80)).parse(form.get('name'));
    const season = z.uuid().parse(form.get('season'));
    const { error } = await (
      await createClient()
    ).rpc('initialize_official_league', { league_name: name, target_season: season });
    if (error) throw new Error('No se pudo configurar la liga oficial. Comprueba la temporada.');
    revalidatePath('/admin');
    return {
      success: 'Liga oficial configurada. Añade participantes y publícala cuando esté lista.',
    };
  } catch (error) {
    return errorState(error);
  }
}
export async function enrollParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const user = z.uuid().parse(form.get('user'));
    const name = nameSchema.pipe(z.string().max(80)).parse(form.get('name'));
    const { error } = await (
      await createClient()
    ).rpc('enroll_official_participant', {
      target_user: user,
      team_name: name,
    });
    if (error)
      throw new Error(
        'No se pudo añadir el participante. Revisa su acceso y el límite de miembros.',
      );
    revalidatePath('/', 'layout');
    return {
      success:
        'Participante añadido a la liga oficial. Si ya estaba inscrito, conserva su equipo y presupuesto.',
    };
  } catch (error) {
    return errorState(error);
  }
}
export async function renameParticipantTeam(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const db: any = await createClient();
    const { error } = await db.rpc('admin_rename_participant_team', {
      target_user: z.uuid().parse(form.get('user')),
      team_name: nameSchema.pipe(z.string().max(80)).parse(form.get('name')),
    });
    if (error) throw new Error(error.message);
    revalidatePath('/', 'layout');
    return { success: 'Nombre del equipo actualizado.' };
  } catch (error) {
    return errorState(error);
  }
}
export async function removeParticipant(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const db: any = await createClient();
    const { error } = await db.rpc('admin_remove_participant', {
      target_user: z.uuid().parse(form.get('user')),
    });
    if (error) throw new Error(error.message);
    revalidatePath('/', 'layout');
    return { success: 'Participante retirado de la liga.' };
  } catch (error) {
    return errorState(error);
  }
}
