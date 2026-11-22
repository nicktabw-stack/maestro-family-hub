export type PushStatus = 'registered' | 'not-configured' | 'unsupported' | 'open-in-new-tab' | 'denied';

export function messagingSenderId(appId: string | undefined) {
  return appId?.split(':')[1] ?? '';
}

export function needsPushInvitation(activeDevice: boolean, dismissedThisSession: boolean) {
  return !activeDevice && !dismissedThisSession;
}

export function requiresHomeScreen(isAppleMobile: boolean, standalone: boolean) {
  return isAppleMobile && !standalone;
}

export function attentionCount(paiements: number, dossiers: number) {
  return paiements + dossiers;
}

export function notificationLink(path: unknown, origin: string) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return `${origin}/espace`;
  const url = new URL(path, origin);
  return url.origin === origin ? url.href : `${origin}/espace`;
}

export const pushMessages: Record<PushStatus, string> = {
  registered: 'Notifications activées sur cet appareil.',
  'not-configured': 'La configuration Firebase est incomplète. Mettez à jour la connexion et sélectionnez « Include web push ».',
  unsupported: 'Ce navigateur ne prend pas en charge les notifications. Sur iPhone, ajoutez d’abord l’application à l’écran d’accueil (iOS 16.4 ou ultérieur).',
  'open-in-new-tab': 'Ouvrez l’application dans son propre onglet ou depuis son icône pour autoriser les notifications.',
  denied: 'Notifications refusées. Autorisez-les dans les réglages du site de votre navigateur, puis réessayez.',
};