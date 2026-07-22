export function cleanupLegacyIndexedDB(): void {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("rockit-legacy-db-cleaned") === "1") return;

    const req = indexedDB.deleteDatabase("RockIt");
    req.onsuccess = () =>
        localStorage.setItem("rockit-legacy-db-cleaned", "1");
    req.onerror = () =>
        console.warn(
            "[offline] no se pudo limpiar la IndexedDB legacy"
        );
}
