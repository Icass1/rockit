import { BACKEND_URL } from "@/environment";
import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "session_id";
let generation = 0;
let sessionWrites = Promise.resolve();
function writeSession(operation: () => Promise<void>): Promise<void> {
    const pending = sessionWrites.then(operation);
    sessionWrites = pending.catch(() => {});
    return pending;
}
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
    try {
        const scope = await getSessionCacheScope();
        if (!scope) return;
        const directory = new Directory(Paths.document, "metadata-v2", scope);
        if (directory.exists) directory.delete();
    } catch {
        /* Optional metadata cleanup does not remove downloaded media. */
    }
}

export function saveSessionCookieValue(
    sessionId: string,
    expectedGeneration?: number
): Promise<void> {
    return writeSession(async () => {
        if (
            expectedGeneration !== undefined &&
            expectedGeneration !== generation
        )
            return;
        if ((await getSessionCookie()) !== sessionId) {
            generation++;
            await clearPrivateMetadata();
            await SecureStore.setItemAsync(SESSION_KEY, sessionId);
        }
    });
}

export async function saveSessionCookie(
    response: Response,
    expectedGeneration = generation
): Promise<void> {
    const setCookie = response.headers.get("set-cookie");

    if (!setCookie) return;

    const match = setCookie.match(/session_id=([^;,\s]+)/);

    if (match?.[1]) {
        await saveSessionCookieValue(match[1], expectedGeneration);
    }
}

export function clearSessionCookie(expectedGeneration?: number): Promise<void> {
    return writeSession(async () => {
        if (
            expectedGeneration !== undefined &&
            expectedGeneration !== generation
        )
            return;
        generation++;
        await clearPrivateMetadata();
        await SecureStore.deleteItemAsync(SESSION_KEY);
    });
}

export async function refreshSessionFromBackend(): Promise<string | null> {
    const stamp = generation;
    try {
        const response = await fetch(`${BACKEND_URL}/auth/session-id`, {
            credentials: "include",
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (stamp === generation && typeof data.sessionId === "string") {
            await saveSessionCookieValue(data.sessionId, stamp);
            return (await getSessionCookie()) === data.sessionId
                ? data.sessionId
                : null;
        }
        return null;
    } catch {
        return null;
    }
}
