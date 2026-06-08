import * as SecureStore from "expo-secure-store";
import { BACKEND_URL } from "@rockit/shared";

const SESSION_KEY = "session_id";

export async function getSessionCookie(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
}

export async function saveSessionCookieValue(sessionId: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, sessionId);
}

export async function saveSessionCookie(response: Response): Promise<void> {
    const setCookie = response.headers.get("set-cookie");

    if (!setCookie) return;

    const match = setCookie.match(/session_id=([^;,\s]+)/);

    if (match?.[1]) {
        await SecureStore.setItemAsync(SESSION_KEY, match[1]);
    }
}

export async function clearSessionCookie(): Promise<void> {
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
            await SecureStore.setItemAsync(SESSION_KEY, data.sessionId);
            return data.sessionId;
        }
        return null;
    } catch {
        return null;
    }
}
