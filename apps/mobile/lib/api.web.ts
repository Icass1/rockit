import { Http } from "@/lib/http";

// Browser sessions are HttpOnly cookies; never extract or recreate them in JS.
export async function saveSessionCookieValue(
    _sessionId: string
): Promise<void> {}
export async function saveSessionCookie(_response: Response): Promise<void> {}
export async function clearSessionCookie(): Promise<void> {
    await Http.discardOfflineSession();
}
