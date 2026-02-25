export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (process.env.NODE_ENV !== "production") {
    // Skip SW in dev to avoid caching headaches
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });
}
