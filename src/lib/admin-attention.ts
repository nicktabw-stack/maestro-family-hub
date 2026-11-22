import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACTUALISATION_PAIEMENTS_MS } from '@/lib/paiement';

export const adminAttentionOptions = queryOptions({
  queryKey: ['admin-attention'],
  refetchInterval: ACTUALISATION_PAIEMENTS_MS,
  queryFn: async () => {
    const [paiements, dossiers] = await Promise.all([
      supabase.from('paiements').select('*, familles(nom)').eq('signale_famille', true).in('statut', ['en_retard', 'partiel']).order('signale_at', { ascending: false }),
      supabase.from('maitres').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    ]);
    if (paiements.error || dossiers.error) throw new Error('Impossible de lire les éléments à traiter.');
    return { paiements: paiements.data ?? [], dossiers: dossiers.count ?? 0 };
  },
});