'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { operatorClient } from '@/lib/supabase/operator';
import type { ActionState } from '@/domain/models';
export async function adminOperation(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const db = await operatorClient();
    const operation = String(form.get('operation'));
    let error: { message: string } | null = null;
    if (operation === 'role') {
      const id = z.uuid().parse(form.get('id'));
      const role = z.enum(['USER', 'ADMIN']).parse(form.get('role'));
      if (id === actor.id) throw new Error('Tu propio rol debe modificarlo otro administrador.');
      if (form.get('confirm') !== 'on') throw new Error('Confirma el cambio de permisos.');
      ({ error } = await db.from('profiles').update({ role }).eq('id', id));
    } else if (operation === 'market') {
      if (form.get('confirm') !== 'on') throw new Error('Confirma la regeneración del mercado.');
      const season = z.uuid().parse(form.get('season'));
      const week = z.iso.date().parse(form.get('week'));
      if (new Date(week + 'T12:00:00Z').getUTCDay() !== 1)
        throw new Error('Selecciona un lunes como inicio de semana.');
      ({ error } = await db.rpc('generate_weekly_market', {
        target_season: season,
        target_week: week,
      }));
    } else if (operation === 'scores') {
      const id = z.uuid().parse(form.get('id'));
      ({ error } = await db.rpc('calculate_matchday_scores', { target_matchday: id }));
    } else if (operation === 'config') {
      const schema = z.object({
        starting_budget: z.coerce.number().int().min(0).max(1e12),
        initial_player_value: z.coerce.number().int().min(0).max(1e12),
        squad_size: z.coerce.number().int().min(1).max(100),
        starter_size: z.coerce.number().int().min(1).max(100),
        max_players_same_real_team: z.coerce.number().int().min(1).max(100),
        captain_multiplier: z.coerce.number().min(1).max(10),
      });
      const values = schema.parse(Object.fromEntries(form));
      if (values.starter_size > values.squad_size)
        throw new Error('Los titulares no pueden superar la plantilla.');
      ({ error } = await db.from('app_config').update(values).eq('id', true));
    } else throw new Error('Operación desconocida.');
    if (error) throw new Error(error.message);
    revalidatePath('/', 'layout');
    return { success: 'Cambios guardados.' };
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? 'Revisa los campos y sus límites.'
          : error instanceof Error
            ? error.message
            : 'No se pudo completar la operación.',
    };
  }
}
