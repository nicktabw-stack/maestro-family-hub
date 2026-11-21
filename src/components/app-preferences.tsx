import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Bell, BellOff, Download, Send, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSessionUser } from '@/hooks/use-auth';
import { registerPushDevice, removePushDevice, testPushNotification } from '@/lib/push.functions';
import { enablePush, disablePush, listenForPush } from '@/lib/push-client';
import { pushMessages } from '@/lib/push-rules';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export const deviceStorageKey = (id: string) => `maitredom-push:${id}`;

export function AppPreferences() {
  const { user } = useSessionUser();
  const register = useServerFn(registerPushDevice);
  const remove = useServerFn(removePushDevice);
  const test = useServerFn(testPushNotification);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [installMessage, setInstallMessage] = useState('');
  const [received, setReceived] = useState('');

  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const complete = () => { setInstalled(true); setInstallEvent(null); };
    const standalone = window.navigator as Navigator & { standalone?: boolean };
    setInstalled(window.matchMedia('(display-mode: standalone)').matches || standalone.standalone === true);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', complete); };
  }, []);

  useEffect(() => {
    if (!user) return;
    setToken(localStorage.getItem(deviceStorageKey(user.id)));
    let cancelled = false;
    let unsubscribe = () => {};
    listenForPush((title, body) => setReceived(`${title} — ${body}`)).then((stop) => {
      if (cancelled) stop(); else unsubscribe = stop;
    }).catch(() => {});
    return () => { cancelled = true; unsubscribe(); };
  }, [user?.id, token]);

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
    <Dialog>
      <DialogTrigger asChild><Button size="icon" variant="ghost" aria-label="Installation et notifications" title="Installation et notifications"><Settings2 /></Button></DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto rounded-lg">
        <DialogTitle>Mon application</DialogTitle>
        <DialogDescription>MaîtreDom</DialogDescription>
        <section className="space-y-3 border-b border-border pb-4">
          <h2 className="font-semibold">Écran d’accueil</h2>
          <Button variant="outline" disabled={installed} onClick={install}><Download />{installed ? 'Application installée' : 'Installer MaîtreDom'}</Button>
          {installMessage && <p role="status" className="text-sm text-muted-foreground">{installMessage}</p>}
        </section>
        <section className="space-y-3">
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">{token ? 'Activées sur cet appareil' : 'Non activées sur cet appareil'}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => action('enable')} disabled={busy}><Bell />{busy ? 'Patientez…' : token ? 'Réactiver' : 'Activer les notifications'}</Button>
            {token && <>
              <Button variant="outline" disabled={busy} onClick={() => action('test')}><Send />Tester</Button>
              <Button variant="outline" disabled={busy} onClick={() => action('disable')}><BellOff />Désactiver</Button>
            </>}
          </div>
          {message && <p role={failed ? 'alert' : 'status'} className={`break-words text-sm ${failed ? 'text-destructive' : 'text-success'}`}>{message}</p>}
          {received && <p role="status" className="text-sm text-foreground">{received}</p>}
        </section>
      </DialogContent>
    </Dialog>
    {received && <p role="status" className="fixed inset-x-4 top-20 z-40 mx-auto max-w-lg border border-border bg-card p-3 text-sm text-card-foreground">{received}</p>}
  </>;
}