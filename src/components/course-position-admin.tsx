import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { needsPositionReview, positionLevel } from '@/lib/course-position';
import { Button } from '@/components/ui/button';
import { StatutBadge } from '@/components/statut-badge';

type CheckRow = Database['public']['Tables']['cours_positions']['Row'];
type AlertRow = { verifie_at: string | null };

export function VerifyCoursePositionButton({ coursId }: { coursId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('verifier_position_cours', { _cours_id: coursId });
      if (error) throw error;
    },
    onMutate: () => setMessage(''),
    onSuccess: () => {
      setMessage('Position marquée comme vérifiée.');
      void queryClient.invalidateQueries({ queryKey: ['admin-historique-cours'] });
      void queryClient.invalidateQueries({ queryKey: ['synthese-admin'] });
    },
    onError: () => setMessage('Vérification non enregistrée. Réessayez.'),
  });
  return <div className="mt-2">
    <Button variant="outline" size="sm" disabled={verify.isPending} onClick={() => verify.mutate()}>
      <Check /> {verify.isPending ? 'Enregistrement…' : 'Marquer comme vérifié'}
    </Button>
    {message && <p role={verify.isError ? 'alert' : 'status'} className="mt-1 text-xs text-foreground">{message}</p>}
  </div>;
}

export function CoursePositionAdmin({ coursId, positions, alert, confirmed }: {
  coursId: string; positions: CheckRow[]; alert: AlertRow | null; confirmed: boolean;
}) {
  const needsReview = needsPositionReview(alert !== null, alert?.verifie_at ?? null, confirmed);
  const tones = { vert: 'succes', orange: 'alerte', rouge: 'danger', gris: 'neutre' } as const;
  const labels = { vert: 'Vert · Proche du domicile', orange: 'Orange · À examiner', rouge: 'Rouge · Position incohérente', gris: 'Gris · Non vérifiable' };
  const phases: Record<string, string> = { debut: 'Démarrage', fin: 'Fin du cours', manuel: 'Validation de la saisie manuelle' };
  return <div className="mt-3 border-t border-border pt-3">
    {positions.length === 0 && <p className="text-xs text-muted-foreground">Gris · Position non disponible : aucun pointage GPS enregistré.</p>}
    <div className="space-y-3">
      {[...positions].sort((a, b) => a.capture_at.localeCompare(b.capture_at)).map((p) => {
        const level = positionLevel(p.distance_m, p.precision_m);
        return <div key={p.id} className="min-w-0">
          <p className="mb-1 text-xs font-semibold">{phases[p.phase] ?? p.phase} · {new Date(p.capture_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</p>
          <StatutBadge ton={tones[level]}>{labels[level]}</StatutBadge>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.distance_m !== null ? `Distance : ${Math.round(p.distance_m)} m` : 'Distance non disponible'}
            {p.precision_m !== null ? ` · Précision GPS : ± ${Math.round(p.precision_m)} m` : ''}
          </p>
          {p.raison && <p className="mt-1 text-xs text-muted-foreground">{p.raison}</p>}
          {p.latitude !== null && p.longitude !== null && <Button asChild variant="link" size="sm" className="h-auto px-0 py-1">
            <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer"><MapPin /> Voir sur la carte</a>
          </Button>}
        </div>;
      })}
    </div>
    {needsReview && <div className="mt-3 border-l-2 border-destructive pl-3">
      <p className="text-xs font-semibold text-destructive">Alerte rouge à vérifier</p>
      {confirmed && <p className="mt-1 text-xs font-semibold text-foreground">Confirmé par le parent</p>}
      <VerifyCoursePositionButton coursId={coursId} />
    </div>}
    {alert?.verifie_at && <p className="mt-2 text-xs text-muted-foreground">Vérifié par la structure le {new Date(alert.verifie_at).toLocaleString('fr-FR')}</p>}
  </div>;
}