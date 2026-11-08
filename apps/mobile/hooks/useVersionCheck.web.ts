/** PWA updates are owned by its service worker, not Android APK releases. */
export function useVersionCheck(): { apkUrl: null; latestVersion: null } {
    return { apkUrl: null, latestVersion: null };
}
