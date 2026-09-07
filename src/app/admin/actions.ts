'use server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { mapImport, importSummary, slugify } from '@/services/mkcentral/player-mapper';
import { MAX_IMPORT_BYTES } from '@/domain/config';
import { playerEditSchema, teamEditSchema } from '@/domain/validation';
import type { ActionState } from '@/domain/models';
import type { Json } from '@/lib/supabase/database';
function failure(error: unknown): ActionState {
  if (error instanceof SyntaxError)
    return { error: 'El archivo no contiene JSON válido. Revisa comas, comillas y corchetes.' };
  if (error instanceof z.ZodError) return { error: error.issues[0].message };
  return { error: error instanceof Error ? error.message : 'No se pudo completar la operación.' };
}
export async function previewImport(text: string) {
  try {
    await requireAdmin();
    if (Buffer.byteLength(text, 'utf8') > MAX_IMPORT_BYTES) throw new Error('El JSON supera 2 MB.');
    const rows = mapImport(JSON.parse(text.replace(/^\uFEFF/, '')));
    const db = await createClient();
    const keys: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from('players')
        .select('source_key')
        .order('id')
        .range(offset, offset + 999);
      if (error) throw new Error('No se pudieron comprobar las identidades existentes.');
      keys.push(...data.map((p) => p.source_key));
      if (data.length < 1000) break;
    }
    return {
      ok: true as const,
      summary: importSummary(rows, keys),
      sample: rows.slice(0, 20).map((r) => ({ name: r.name, teamName: r.teamName })),
    };
  } catch (error) {
    return { ok: false as const, error: failure(error).error ?? 'No se pudo analizar el archivo.' };
  }
}
export async function confirmImport(text: string, seasonId: string): Promise<ActionState> {
  try {
    await requireAdmin();
    z.uuid().parse(seasonId);
    if (Buffer.byteLength(text, 'utf8') > MAX_IMPORT_BYTES) throw new Error('El JSON supera 2 MB.');
    const rows = mapImport(JSON.parse(text.replace(/^\uFEFF/, '')));
    const db = await createClient();
    const { data, error } = await db.rpc('import_players', {
      payload: rows as unknown as Json,
      target_season: seasonId,
    });
    if (error)
      throw new Error(
        'No se pudo importar. Comprueba la temporada y las identidades; no se ha guardado ninguna fila.',
      );
    revalidatePath('/', 'layout');
    const result = data as { inserted: number; updated: number; teams: number };
    return {
      success: `Importación completada: ${result.inserted} nuevos, ${result.updated} actualizados y ${result.teams} equipos.`,
    };
  } catch (error) {
    return failure(error);
  }
}
export async function savePlayer(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const values = playerEditSchema.parse(Object.fromEntries(form));
    const { id, ...update } = values;
    const db = await createClient();
    const { data, error } = await db
      .from('players')
      .update(update)
      .eq('id', id)
      .select('id')
      .single();
    if (error || !data)
      throw new Error('No se pudo guardar el jugador. Comprueba que el equipo y jugador existen.');
    revalidatePath('/', 'layout');
    return { success: 'Jugador guardado. Los cambios de valor quedan registrados.' };
  } catch (error) {
    return failure(error);
  }
}
export async function saveTeam(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const { id, ...values } = teamEditSchema.parse(Object.fromEntries(form));
    const db = await createClient();
    const result = id
      ? await db.from('teams').update(values).eq('id', id).select('id').single()
      : await db
          .from('teams')
          .insert({
            ...values,
            source_key: `team:${values.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()}`,
            slug: `${slugify(values.name)}-${randomUUID()}`,
          })
          .select('id')
          .single();
    if (result.error) throw new Error('No se pudo guardar el equipo. Es posible que ya exista.');
    revalidatePath('/', 'layout');
    return { success: 'Equipo guardado.' };
  } catch (error) {
    return failure(error);
  }
}
export async function deleteTeam(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const id = z.uuid().parse(form.get('id'));
    if (form.get('confirm') !== 'on')
      throw new Error('Confirma que quieres borrar el equipo vacío.');
    const db = await createClient();
    const { error } = await db.from('teams').delete().eq('id', id).select('id').single();
    if (error)
      throw new Error('Solo se pueden borrar equipos sin jugadores ni historial de competición.');
    revalidatePath('/', 'layout');
    return { success: 'Equipo eliminado.' };
  } catch (error) {
    return failure(error);
  }
}
