import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const terminerCoursEtNotifier = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ coursId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('terminer_cours', { _cours_id: data.coursId });
    if (error) throw new Error('Impossible de terminer ce cours.');
    const { dispatchNotification } = await import('./notification-events.server');
    try {
      const result = await dispatchNotification('cours_termine', data.coursId, context.userId);
      return { notificationFailed: result.failed > 0 };
    } catch { return { notificationFailed: true }; }
  });

export const saisirCoursEtNotifier = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ requestId: z.string().uuid(), enfantId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), debut: z.string().regex(/^\d{2}:\d{2}$/), fin: z.string().regex(/^\d{2}:\d{2}$/), matiere: z.string().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc('saisir_cours_manuel_unique', { _request_id: data.requestId, _enfant_id: data.enfantId, _date: data.date, _debut: data.debut, _fin: data.fin, _matiere: data.matiere.trim() });
    if (error || !id) throw new Error('Impossible d’enregistrer les heures.');
    const { dispatchNotification } = await import('./notification-events.server');
    try {
      const result = await dispatchNotification('cours_termine', id, context.userId);
      return { id, notificationFailed: result.failed > 0 };
    } catch { return { id, notificationFailed: true }; }
  });

export const signalerPaiementEtNotifier = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: id, error } = await context.supabase.rpc('signaler_paiement');
    if (error || !id) throw new Error(error?.message ?? 'Impossible de signaler le paiement.');
    const { dispatchNotification } = await import('./notification-events.server');
    try {
      const result = await dispatchNotification('paiement_signale', id, context.userId);
      return { notificationFailed: result.failed > 0 };
    } catch { return { notificationFailed: true }; }
  });