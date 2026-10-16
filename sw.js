/* הפועל מרמורק רחובות - service worker: התראות push + דרישת התקנה. הרשת תמיד טרייה. */
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network-only: האתר תמיד עדכני */ });
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'הפועל מרמורק רחובות', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    tag: d.tag || 'maccabi-game',
    data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(c => c.url.includes('maccabi-rehovot-2026'));
    if (c) { c.focus(); c.navigate(url); } else clients.openWindow(url);
  }));
});
