'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { ActionState } from '@/domain/models';

export async function practiceAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const db = await createClient();
    const operation = z
      .enum([
        'controls',
        'create',
        'market',
        'settle',
        'first_prepare',
        'first_tick',
        'first_shop',
        'first_settle',
      ])
      .parse(form.get('operation'));
    const result =
      operation === 'controls'
        ? await db.rpc('admin_test_controls', {
            enabled: form.get('enabled') === 'on',
            market_open: form.get('market') === 'on',
            lineup_open: form.get('lineup') === 'on',
            scores_open: form.get('scores') === 'on',
            target_matchday: z
              .uuid()
              .nullable()
              .parse(form.get('day') || null),
          })
        : operation === 'create'
          ? await db.rpc('admin_create_test_matchday', {
              day_name: z.string().trim().min(1).max(100).parse(form.get('name')),
            })
          : operation === 'market'
            ? await db.rpc('admin_test_new_market', {})
            : operation === 'settle'
              ? await db.rpc('admin_test_settle_market', {})
              : operation === 'first_prepare'
                ? await db.rpc('admin_prepare_first_week', {})
                : operation === 'first_tick'
                  ? await db.rpc('admin_first_week_tick', {})
                  : operation === 'first_shop'
                    ? await db.rpc('admin_first_week_shop', { target_day: String(form.get('day')) })
                    : await db.rpc('admin_first_week_settle', {
                        target_day: String(form.get('day')),
                      });
    if (result.error) throw new Error(result.error.message);
    revalidatePath('/', 'layout');
    return {
      success:
        operation === 'settle' || operation === 'first_settle'
          ? `Mercado cerrado: ${result.data} fichajes adjudicados. Las pujas sin saldo o sin plaza no se adjudican.`
          : 'Cambios guardados.',
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo completar la operación.' };
  }
}
