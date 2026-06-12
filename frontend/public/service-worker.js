/* global firebase */
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js");

const CACHE_PREFIX = "comconnect";
const CACHE_NAME = `${CACHE_PREFIX}-app-v3`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/comconnect-mark.svg",
  "/comconnect-192.png",
  "/comconnect-512.png",
];

firebase.initializeApp({
  apiKey: "AIzaSyC2ZYTLEBAcMvmYa5fhQdDoUrcWa9YzdTA",
  authDomain: "comconnect-2b1d7.firebaseapp.com",
  projectId: "comconnect-2b1d7",
  storageBucket: "comconnect-2b1d7.firebasestorage.app",
  messagingSenderId: "854170103458",
  appId: "1:854170103458:web:9661dd687bcdf4e12db1fb",
});
firebase.messaging();

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (
    ["script", "style", "image", "font"].includes(request.destination) ||
    url.pathname.startsWith("/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path =
    data.url ||
    (data.workspaceId
      ? `/workspace/${data.workspaceId}/chats`
      : "/workspace");
  const destination = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const existing = clients.find((client) =>
          client.url.startsWith(self.location.origin)
        );
        if (existing) {
          await existing.navigate(destination);
          return existing.focus();
        }
        return self.clients.openWindow(destination);
      })
  );
});
