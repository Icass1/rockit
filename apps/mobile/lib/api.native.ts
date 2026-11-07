import { BACKEND_URL } from "@rockit/shared";
import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "session_id";
let generation = 0;
export function sessionGeneration(): number {
    return generation;
}
export async function getSessionCacheScope(): Promise<string | null> {
    const cookie = await getSessionCookie();
    return cookie
        ? digestStringAsync(CryptoDigestAlgorithm.SHA256, cookie)
        : null;
}

export async function getSessionCookie(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
}

async function clearPrivateMetadata(): Promise<void> {
    const scope = await getSessionCacheScope();
    if (!scope) return;
    try {
        const directory = new Directory(Paths.document, "metadata-v2", scope);
        if (directory.exists) directory.delete();
    } catch {
        /* Optional metadata cleanup does not remove downloaded media. */
    }
}

export async function saveSessionCookieValue(sessionId: string): Promise<void> {
    if ((await getSessionCookie()) !== sessionId) {
        generation++;
        await clearPrivateMetadata();
    }
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
    generation++;
    await clearPrivateMetadata();
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
