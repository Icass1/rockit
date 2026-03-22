import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "session_id_value";

export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function getSessionCookie(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
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

export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    const sessionId = await getSessionCookie();
    return fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
            ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
        },
    });
}
