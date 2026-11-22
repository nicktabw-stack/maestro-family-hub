import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const deviceInput = z.object({ token: z.string().min(20).max(4096) });

export const checkPushDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: device, error } = await context.supabase.from('push_devices').select('id').eq('user_id', context.userId).eq('token', data.token).maybeSingle();
    if (error) throw new Error('Impossible de vérifier les notifications.');
    return { active: Boolean(device) };
  });

export const registerPushDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('push_devices').upsert({ user_id: context.userId, token: data.token, updated_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
    if (error) throw new Error('Impossible d’enregistrer cet appareil. Réessayez.');
    return { ok: true };
  });

export const removePushDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('push_devices').delete().eq('user_id', context.userId).eq('token', data.token);
    if (error) throw new Error('Impossible de désactiver les notifications. Réessayez.');
    return { ok: true };
  });

export const testPushNotification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: device, error } = await context.supabase.from('push_devices').select('id').eq('user_id', context.userId).eq('token', data.token).maybeSingle();
    if (error || !device) throw new Error('Activez les notifications sur cet appareil avant le test.');
    const apiKey = process.env['LOVABLE_API_KEY'];
    const connectionKey = process.env['FIREBASE_MESSAGING_API_KEY'];
    if (!apiKey || !connectionKey) throw new Error('La connexion Firebase est incomplète.');
    const response = await fetch('https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: data.token, notification: { title: 'MaîtreDom', body: 'Les notifications fonctionnent sur cet appareil.' }, data: { path: '/espace' } } }),
    });
    if (!response.ok) {
      const body = await response.text();
      // Tokens must never be included in logs or error messages.
      const safeBody = body.split(data.token).join('[appareil]');
      console.error(`Firebase [${response.status}]: ${safeBody}`);
      if ((response.status === 404 && body.includes('UNREGISTERED')) || (response.status === 400 && body.includes('INVALID_ARGUMENT'))) {
        await context.supabase.from('push_devices').delete().eq('id', device.id);
        throw new Error(`Firebase [${response.status}] : appareil expiré. Réactivez les notifications.`);
      }
      throw new Error(`Firebase [${response.status}] : ${safeBody}`);
    }
    return { ok: true };
  });