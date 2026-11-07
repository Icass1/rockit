export function subscribeToResume(listener: () => void): () => void {
    const handle = () => {
        if (!document.hidden) listener();
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
}
