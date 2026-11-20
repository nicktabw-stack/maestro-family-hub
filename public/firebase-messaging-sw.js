/* Dedicated messaging worker: no app-shell caching. */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Register click handling before Firebase's own listener.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  const path = event.notification.data?.FCM_MSG?.data?.path;
  let url = new URL('/espace', self.location.origin);
  if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
    const candidate = new URL(path, self.location.origin);
    if (candidate.origin === self.location.origin) url = candidate;
  }
  event.waitUntil(self.clients.openWindow(url.href));
});
firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();