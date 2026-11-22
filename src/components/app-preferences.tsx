import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bell, BellOff, Download, Send, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSessionUser } from '@/hooks/use-auth';
import { checkPushDevice, registerPushDevice, removePushDevice, testPushNotification } from '@/lib/push.functions';
import { enablePush, disablePush, listenForPush } from '@/lib/push-client';
import { needsPushInvitation, notificationLink, pushMessages, requiresHomeScreen } from '@/lib/push-rules';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export const deviceStorageKey = (id: string) => `maitredom-push:${id}`;

export function AppPreferences() {
  const { user } = useSessionUser();
  const register = useServerFn(registerPushDevice);
  const remove = useServerFn(removePushDevice);
  const test = useServerFn(testPushNotification);
  const checkDevice = useServerFn(checkPushDevice);
  const [open, setOpen] = useState(false);
  const [invitation, setInvitation] = useState(false);
  const [appleMobile, setAppleMobile] = useState(false);
  const [denied, setDenied] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [received, setReceived] = useState<{ text: string; href: string } | null>(null);
  const sessionKey = user ? `push-invitation:${user.id}:${user.last_sign_in_at ?? user.created_at}` : '';

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const complete = () => { setInstalled(true); setInstallEvent(null); };
    const standalone = window.navigator as Navigator & { standalone?: boolean };
    setAppleMobile(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setDenied('Notification' in window && Notification.permission === 'denied');
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || standalone.standalone === true);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', complete); };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsubscribe = () => {};
    listenForPush((title, body, path) => setReceived({ text: `${title} — ${body}`, href: notificationLink(path, window.location.origin) })).then((stop) => {
      if (cancelled) stop(); else unsubscribe = stop;
    }).catch(() => {});
    return () => { cancelled = true; unsubscribe(); };
  }, [user?.id, token]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const stored = localStorage.getItem(deviceStorageKey(user.id));
    const allowed = 'Notification' in window && Notification.permission === 'granted';
    const verification = stored && allowed ? checkDevice({ data: { token: stored } }).then((result) => result.active).catch(() => false) : Promise.resolve(false);
    verification.then((active) => {
      if (cancelled) return;
      setToken(active ? stored : null);
      if (needsPushInvitation(active, sessionStorage.getItem(sessionKey) === 'later')) {
        setInvitation(true); setOpen(true);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id, sessionKey]);

  function changeOpen(value: boolean) {
    if (!value && invitation) {
      sessionStorage.setItem(sessionKey, 'later');
      setInvitation(false);
    }
    setOpen(value);
  }

  async function install() {
    if (window.top !== window.self) {
      setInstallMessage('Ouvrez l’application dans son propre onglet pour l’ajouter à l’écran d’accueil.');
    } else if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      setInstallMessage(choice.outcome === 'accepted' ? 'Installation demandée.' : 'Installation annulée.');
    } else {
      setInstallMessage(/iPad|iPhone|iPod/.test(navigator.userAgent)
        ? 'Dans Safari : Partager → Sur l’écran d’accueil → Ajouter.'
        : 'Dans le menu du navigateur : Installer l’application ou Ajouter à l’écran d’accueil.');
    }
  }

  async function action(mode: 'enable' | 'disable' | 'test') {
    if (!user || busy) return;
    setBusy(true); setMessage(''); setFailed(false);
    try {
      if (mode === 'enable') {
        const result = await enablePush();
        if (result.status !== 'registered' || !result.token) {
          setFailed(true); setMessage(pushMessages[result.status]); return;
        }
        await register({ data: { token: result.token } });
        localStorage.setItem(deviceStorageKey(user.id), result.token);
        setToken(result.token); setMessage(pushMessages.registered);
        setInvitation(false); setDenied(false);
      } else if (token && mode === 'disable') {
        await remove({ data: { token } });
        localStorage.removeItem(deviceStorageKey(user.id));
        setToken(null);
        await disablePush();
        setMessage('Notifications désactivées sur cet appareil.');
      } else if (token) {
        await test({ data: { token } });
        setMessage('Notification de test envoyée à cet appareil.');
      }
    } catch (error) {
      setFailed(true);
      const detail = error instanceof Error ? error.message : '';
      setMessage(detail.toLowerCase().includes('permission denied')
        ? pushMessages.denied
        : detail.includes('subscribe') || detail.includes('messaging/')
        ? 'L’activation des notifications a échoué. Vérifiez votre connexion et les autorisations du navigateur, puis réessayez.'
        : detail || 'Impossible de terminer. Réessayez.');
    } finally { setBusy(false); }
  }

  return <>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" aria-label="Installation et notifications" title="Installation et notifications" onClick={() => setInvitation(false)}><Settings2 /></Button></DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto rounded-lg">
        <DialogTitle>{invitation ? 'Restez informé' : 'Mon application'}</DialogTitle>
        <DialogDescription>MaîtreDom</DialogDescription>
        {(!invitation || requiresHomeScreen(appleMobile, installed)) && <section className="space-y-3 border-b border-border pb-4">
          <h2 className="font-semibold">Écran d’accueil</h2>
          <Button variant="outline" disabled={installed} onClick={install}><Download />{installed ? 'Application installée' : 'Installer MaîtreDom'}</Button>
          {requiresHomeScreen(appleMobile, installed) && <p className="text-sm text-muted-foreground">Sur iPhone : ouvrez MaîtreDom dans Safari, touchez Partager, puis « Sur l’écran d’accueil » et « Ajouter ». Ouvrez ensuite l’application depuis son icône pour activer les notifications.</p>}
          {installMessage && <p role="status" className="text-sm text-muted-foreground">{installMessage}</p>}
        </section>}
        {!requiresHomeScreen(appleMobile, installed) && <section className="space-y-3">
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">{token ? 'Activées sur cet appareil' : 'Non activées sur cet appareil'}</p>
          {denied && <p className="text-sm text-destructive">Notifications refusées. Dans les réglages de votre navigateur, ouvrez les autorisations de ce site et autorisez les notifications. Sur iPhone : Réglages → Notifications → MaîtreDom → Autoriser les notifications.</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => action('enable')} disabled={busy}><Bell />{busy ? 'Patientez…' : token ? 'Réactiver' : 'Activer les notifications'}</Button>
            {token && <>
              <Button variant="outline" disabled={busy} onClick={() => action('test')}><Send />Tester</Button>
              <Button variant="outline" disabled={busy} onClick={() => action('disable')}><BellOff />Désactiver</Button>
            </>}
          </div>
          {message && <p role={failed ? 'alert' : 'status'} className={`break-words text-sm ${failed ? 'text-destructive' : 'text-success'}`}>{message}</p>}
          {received && <a href={received.href} className="text-sm text-primary">{received.text}</a>}
        </section>}
        {invitation && <Button variant="ghost" onClick={() => changeOpen(false)}>Plus tard</Button>}
      </DialogContent>
    </Dialog>
    {received && <div role="status" className="fixed inset-x-4 top-20 z-40 mx-auto flex max-w-lg items-start gap-2 border border-border bg-card p-3 text-sm text-card-foreground"><a href={received.href} className="flex-1">{received.text}</a><Button variant="ghost" size="sm" onClick={() => setReceived(null)} aria-label="Fermer la notification">×</Button></div>}
  </>;
}