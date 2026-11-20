import { messagingSenderId, type PushStatus } from './push-rules';

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY;
const config = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID,
  appId,
  messagingSenderId: messagingSenderId(appId),
};

async function messagingClient() {
  const [{ getApps, initializeApp }, { getMessaging }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  return getMessaging(getApps().find((app) => app.name === 'maitredom-push') ?? initializeApp(config, 'maitredom-push'));
}

export async function enablePush(): Promise<{ status: PushStatus; token?: string }> {
  if (window.top !== window.self) return { status: 'open-in-new-tab' };
  if (!config.apiKey || !config.projectId || !appId || !vapidKey || !config.messagingSenderId) return { status: 'not-configured' };
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return { status: 'unsupported' };
  const { isSupported, getToken } = await import('firebase/messaging');
  if (!(await isSupported())) return { status: 'unsupported' };
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' };
  const query = new URLSearchParams(config).toString();
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  const token = await getToken(await messagingClient(), { vapidKey, serviceWorkerRegistration: registration });
  return token ? { status: 'registered', token } : { status: 'denied' };
}

export async function disablePush() {
  const { deleteToken } = await import('firebase/messaging');
  await deleteToken(await messagingClient());
}

export async function listenForPush(callback: (title: string, body: string) => void) {
  if (!config.apiKey || !appId || !('Notification' in window) || Notification.permission !== 'granted') return () => {};
  const { isSupported, onMessage } = await import('firebase/messaging');
  if (!(await isSupported())) return () => {};
  return onMessage(await messagingClient(), (message) => callback(message.notification?.title ?? 'MaîtreDom', message.notification?.body ?? ''));
}