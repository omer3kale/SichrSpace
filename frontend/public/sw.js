self.addEventListener("install", (event) => {
  // Minimal install handler for future use
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean-up logic can go here later
  clients.claim();
});

self.addEventListener("fetch", (event) => {
  // For now, just pass through all requests
  // You can implement caching strategies here later
});
