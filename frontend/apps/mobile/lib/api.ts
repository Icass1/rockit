import { BACKEND_URL } from "@rockit/shared";
import { Directory, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "session_id";

export async function getSessionCookie(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
}

function clearCollectionCache(): void {
    try {
        const directory = new Directory(Paths.document, "collections");
        if (directory.exists) directory.delete();
    } catch {
        // Cache cleanup should not prevent authentication.
    }
}

export async function saveSessionCookieValue(sessionId: string): Promise<void> {
    if ((await getSessionCookie()) !== sessionId) clearCollectionCache();
    await SecureStore.setItemAsync(SESSION_KEY, sessionId);
}

export async function saveSessionCookie(response: Response): Promise<void> {
    const setCookie = response.headers.get("set-cookie");

    if (!setCookie) return;

    const match = setCookie.match(/session_id=([^;,\s]+)/);

    if (match?.[1]) {
        await saveSessionCookieValue(match[1]);
    }
}

export async function clearSessionCookie(): Promise<void> {
    clearCollectionCache();
    await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function refreshSessionFromBackend(): Promise<string | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/auth/session-id`, {
            credentials: "include",
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (typeof data.sessionId === "string") {
            await saveSessionCookieValue(data.sessionId);
            return data.sessionId;
        }
        return null;
    } catch {
        return null;
    }
}
