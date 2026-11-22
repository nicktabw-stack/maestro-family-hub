import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Called only after the authenticated RPC has verified ownership of the action.
export async function dispatchNotification(kind: 'cours_termine' | 'paiement_signale', resourceId: string, actorId: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: event, error } = await supabaseAdmin.from('push_events').select('*').eq('kind', kind).eq('resource_id', resourceId).eq('actor_id', actorId).maybeSingle();
  if (error) throw new Error('Impossible de lire la notification à envoyer.');
  if (!event || !event.recipient_ids.length) return { sent: 0, failed: 0 };
  const { data: devices, error: devicesError } = await supabaseAdmin.from('push_devices').select('id,token').in('user_id', event.recipient_ids);
  if (devicesError) throw new Error('Impossible de lire les appareils destinataires.');
  const apiKey = process.env['LOVABLE_API_KEY'];
  const connectionKey = process.env['FIREBASE_MESSAGING_API_KEY'];
  if (!apiKey || !connectionKey) throw new Error('La connexion Firebase est incomplète.');
  let sent = 0; let failed = 0;
  await Promise.all((devices ?? []).map(async (device) => {
    // Atomic reservation: a concurrent/repeated request cannot send again.
    const { data: claim, error: claimError } = await supabaseAdmin.from('push_deliveries').insert({ event_id: event.id, device_id: device.id }).select('id').single();
    if (claimError?.code === '23505') return;
    if (claimError || !claim) { failed++; return; }
    try {
      await sendToDevice(supabaseAdmin, device, event, apiKey, connectionKey);
      await supabaseAdmin.from('push_deliveries').update({ status: 'sent' }).eq('id', claim.id);
      sent++;
    } catch {
      await supabaseAdmin.from('push_deliveries').update({ status: 'failed' }).eq('id', claim.id);
      failed++;
    }
  }));
  return { sent, failed };
}

async function sendToDevice(client: SupabaseClient<Database>, device: { id: string; token: string }, event: Database['public']['Tables']['push_events']['Row'], apiKey: string, connectionKey: string) {
  const gatewayUrl = 'https://connector-gateway.lovable.dev/firebase_messaging';
  // Retry only explicit transient rejections, never an ambiguous network failure.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${gatewayUrl}/v1/projects/_/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token: device.token, notification: { title: 'MaîtreDom', body: event.body }, data: { path: event.path, event_id: event.id }, webpush: { notification: { tag: event.id, icon: '/icons/icon-192.png' } } } }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) return;
    const body = (await response.text()).split(device.token).join('[appareil]');
    console.error(`Firebase [${response.status}]: ${body}`);
    if ((response.status === 404 && body.includes('UNREGISTERED')) || (response.status === 400 && body.includes('INVALID_ARGUMENT'))) {
      await client.from('push_devices').delete().eq('id', device.id);
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      continue;
    }
    throw new Error(`Firebase [${response.status}]: ${body}`);
  }
}