export async function cleanupLegacyServiceWorker(): Promise<void> {
    if (
        typeof navigator === "undefined" ||
        !("serviceWorker" in navigator)
    )
        return;

    const registrations =
        await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
        const scriptUrl =
            reg.active?.scriptURL ??
            reg.installing?.scriptURL ??
            reg.waiting?.scriptURL ??
            "";
        if (scriptUrl.endsWith("/service-worker.js")) {
            await reg.unregister();
        }
    }
}
