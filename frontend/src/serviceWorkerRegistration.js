const serviceWorkerUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

const dispatch = (name, detail) => {
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

export function register(config = {}) {
  if (
    process.env.NODE_ENV === "test" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        serviceWorkerUrl,
        { scope: "/" }
      );

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state !== "installed") return;
          if (navigator.serviceWorker.controller) {
            dispatch("comconnect:pwa-update", registration);
            config.onUpdate?.(registration);
          } else {
            dispatch("comconnect:pwa-ready", registration);
            config.onSuccess?.(registration);
          }
        });
      });
    } catch (error) {
      console.error("PWA service worker registration failed:", error);
    }
  });
}

export function unregister() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => console.error(error.message));
}
