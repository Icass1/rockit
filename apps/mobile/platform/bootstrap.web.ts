import { syncManager } from "@/lib/syncManager";

export async function initializePlatform(): Promise<void> {
    if (!document.getElementById("rockit-video-root")) {
        const root = document.createElement("div");
        root.id = "rockit-video-root";
        root.setAttribute("aria-hidden", "true");
        Object.assign(root.style, {
            position: "fixed",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            opacity: "0",
            pointerEvents: "none",
        });
        document.body.appendChild(root);
    }
    const orientation = screen.orientation as ScreenOrientation & {
        lock?: (mode: string) => Promise<void>;
    };
    if (typeof orientation?.lock === "function")
        void orientation.lock("portrait").catch(() => {});
    await syncManager.init();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
        void navigator.serviceWorker
            .register("/sw.js")
            .then(async () => {
                const registration = await navigator.serviceWorker.ready;
                const worker = registration.active;
                if (!worker) return;
                const urls = performance
                    .getEntriesByType("resource")
                    .map((entry) => entry.name)
                    .filter(
                        (url) =>
                            new URL(url).origin === location.origin &&
                            new URL(url).pathname.startsWith("/_expo/static/")
                    );
                worker.postMessage({ type: "CACHE_STATIC_ASSETS", urls });
            })
            .catch(() => {});
    void navigator.storage?.persist?.().catch(() => false);
}

export async function hideSplash(): Promise<void> {}
