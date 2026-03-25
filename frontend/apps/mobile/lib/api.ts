import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "session_id_value";

export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const FAKE_MODE = process.env.EXPO_PUBLIC_FAKE_AUTH === "true";

const FAKE_RESPONSES: Record<string, unknown> = {
    "/session": {
        username: "dev",
        image: "",
        admin: false,
        queueType: null,
        currentTimeMs: null,
    },
    "/stats/home": {
        songsByTimePlayed: [],
        randomSongsLastMonth: [],
        hiddenGems: [],
        communityTop: [],
        monthlyTop: [],
    },
    "/library": {
        likedPlaylists: [],
        userPlaylists: [],
        likedAlbums: [],
        likedArtists: [],
    },
    "/media/liked": [],
    "/media/search": [],
    "/downloads": [],
    "/user": {
        username: "dev",
        lang: "en",
        crossfade: 0,
        randomQueue: false,
        repeatMode: "none",
    },
};

export async function getSessionCookie(): Promise<string | null> {
    if (FAKE_MODE) return "fake_session_id";
    return SecureStore.getItemAsync(SESSION_KEY);
}

export async function saveSessionCookie(response: Response): Promise<void> {
    if (FAKE_MODE) {
        await SecureStore.setItemAsync(SESSION_KEY, "fake_session_id");
        return;
    }

    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) return;

    const match = setCookie.match(/session_id=([^;,\s]+)/);
    if (match?.[1]) {
        await SecureStore.setItemAsync(SESSION_KEY, match[1]);
    }
}

export async function clearSessionCookie(): Promise<void> {
    if (FAKE_MODE) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function apiFetch(
    path: string,
    options: RequestInit = {}
): Promise<Response> {
    if (FAKE_MODE) {
        const fakeData = FAKE_RESPONSES[path];
        if (fakeData !== undefined) {
            return new Response(JSON.stringify(fakeData), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response(
            JSON.stringify({ error: "Not implemented in fake mode" }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    return fetch(`${BACKEND_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
}
