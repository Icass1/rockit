import { getSessionCookie, refreshSessionFromBackend } from "@/lib/api";

/** Native cookie storage is separate from the operating system's cookie jar. */
export async function createSocket(url: string): Promise<WebSocket> {
    const session =
        (await getSessionCookie()) ?? (await refreshSessionFromBackend());
    if (!session) throw new Error("Session unavailable");
    const Socket = WebSocket as unknown as new (
        url: string,
        protocols?: string[],
        options?: { headers: Record<string, string> }
    ) => WebSocket;
    return new Socket(url, undefined, {
        headers: { Cookie: `session_id=${session}` },
    });
}
