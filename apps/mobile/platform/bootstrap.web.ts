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
    await syncManager.init();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
        void navigator.serviceWorker.register("/sw.js").catch(() => {});
    void navigator.storage?.persist?.().catch(() => false);
}

export async function hideSplash(): Promise<void> {}
