/* Sample service worker for web push notifications.
 * Copy this file into your frontend's public folder (same origin as the page)
 * or serve the frontend from this server, then register it with:
 *   navigator.serviceWorker.register('/sw.js')
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    console.warn('Invalid push payload', error);
  }

  const { title = 'Nodist', message = '', url = '/', data = {} } = payload;

  const options = {
    body: message,
    data: { url, ...data },
    tag: data.tag || 'nodist-notification',
    // Optional: point these at an icon your frontend actually serves, e.g.
    // icon: '/icons/icon-192.png',
    // badge: '/icons/badge-96.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
