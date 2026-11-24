import { z } from 'zod';
import { GeolocationError, getCurrentPosition } from './geolocation';

// Never select the retired GPS columns, even for admin course lists.
export const COURSE_SAFE_FIELDS = 'id,enfant_id,maitre_id,maitre_remplacant_id,date_cours,heure_debut,heure_fin,matiere,statut,compte_rendu,created_at,updated_at,debut_reel,fin_reelle,saisie_manuelle,confirme_famille,confirme_famille_at' as const;

export const coursePositionSchema = z.object({
  lat: z.number().finite().min(-90).max(90).nullable(),
  lng: z.number().finite().min(-180).max(180).nullable(),
  accuracy: z.number().finite().min(0).max(10000000).nullable(),
  reason: z.enum(['permission-denied', 'timeout', 'unavailable', 'unsupported']).nullable(),
});
export type CoursePosition = z.infer<typeof coursePositionSchema>;
export type PositionLevel = 'vert' | 'orange' | 'rouge' | 'gris';

// Same precedence as public.niveau_position, which assigns the stored level.
export function positionLevel(distance: number | null, accuracy: number | null): PositionLevel {
  if (distance === null) return 'gris';
  if (distance > 500) return 'rouge';
  if (distance >= 200 || (accuracy !== null && accuracy > 200)) return 'orange';
  return 'vert';
}

export function needsPositionReview(hasRedAlert: boolean, verifiedAt: string | null, _parentConfirmed: boolean) {
  return hasRedAlert && verifiedAt === null;
}

export async function captureCoursePosition(): Promise<CoursePosition> {
  try {
    const { coords } = await getCurrentPosition(10000, 0);
    return coursePositionSchema.parse({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, reason: null });
  } catch (error) {
    return { lat: null, lng: null, accuracy: null, reason: error instanceof GeolocationError ? error.reason : 'unavailable' };
  }
}