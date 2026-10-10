// Q-03 · Vortex's service worker: shows the (at most one a day) push he
// sends while the tab is closed, and opens Yondra where he points. It does
// nothing else — no caching, no background fetches.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "vortex", body: "…", url: "/dashboard", tag: "vortex" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url ?? "/dashboard",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((tabs) => {
        for (const t of tabs)
          if (t.url.startsWith(self.location.origin))
            return t.focus().then((c) => c.navigate(url));
        return self.clients.openWindow(url);
      }),
  );
});
