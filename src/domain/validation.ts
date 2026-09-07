import { z } from 'zod';
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Escribe un nombre.')
  .max(120)
  .refine((v) => !/[\u0000-\u001f\u007f]/u.test(v), 'El nombre contiene caracteres de control.');
export const credentialsSchema = z.object({
  email: z.email('Introduce un correo válido.').max(254),
  password: z.string().min(8, 'Usa al menos 8 caracteres.').max(128),
});
export const loginSchema = z.object({
  email: z.email('Introduce un correo válido.').max(254),
  password: z.string().min(1).max(128),
});
export const signupSchema = credentialsSchema.extend({
  displayName: nameSchema.pipe(z.string().max(80)),
});
export const playerEditSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  team_id: z.uuid(),
  market_value: z.coerce.number().int().min(0).max(1_000_000_000_000),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});
export const teamEditSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]),
  name: nameSchema,
  tag: z.string().trim().max(20),
  color: z.string().regex(/^#[\da-fA-F]{6}$/),
});
