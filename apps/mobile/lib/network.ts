const FORCE_OFFLINE = false;

export async function checkNetworkConnection(): Promise<boolean> {
    if (FORCE_OFFLINE) return false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch("https://www.google.com/generate_204", {
            method: "HEAD",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok || response.status === 0;
    } catch {
        return false;
    }
}
