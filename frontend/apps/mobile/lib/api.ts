import { DEFAULT_VOCABULARY } from "@rockit/shared";
import * as SecureStore from "expo-secure-store";
import { ZodType } from "zod";

const SESSION_KEY = "session_id_value";

export const BACKEND_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL ?? "EXPO_PUBLIC_BACKEND_URL";

const FAKE_MODE = process.env.EXPO_PUBLIC_FAKE_AUTH === "true";

const FAKE_RESPONSES: Record<string, unknown> = {
    "/user/session": {
        username: "dev",
        image: "",
        admin: false,
        queueType: null,
        currentTimeMs: null,
    },
    "/vocabulary/user": {
        vocabulary: DEFAULT_VOCABULARY,
        currentLang: "en",
    },
    "/stats/home": {
        songsByTimePlayed: [],
        randomSongsLastMonth: [],
        hiddenGems: [],
        communityTop: [],
        monthlyTop: [],
    },
    "/stats/user": {
        summary: {
            songsListened: 42,
            minutesListened: 156.5,
            avgMinutesPerSong: 3.73,
            currentStreak: 7,
            topGenre: "Rock",
        },
        minutes: [
            {
                minutes: 15,
                start: "2026-03-06T00:00:00Z",
                end: "2026-03-07T00:00:00Z",
            },
            {
                minutes: 8,
                start: "2026-03-07T00:00:00Z",
                end: "2026-03-08T00:00:00Z",
            },
            {
                minutes: 24,
                start: "2026-03-08T00:00:00Z",
                end: "2026-03-09T00:00:00Z",
            },
            {
                minutes: 19,
                start: "2026-03-09T00:00:00Z",
                end: "2026-03-10T00:00:00Z",
            },
            {
                minutes: 12,
                start: "2026-03-10T00:00:00Z",
                end: "2026-03-11T00:00:00Z",
            },
            {
                minutes: 26,
                start: "2026-03-11T00:00:00Z",
                end: "2026-03-12T00:00:00Z",
            },
            {
                minutes: 16,
                start: "2026-03-12T00:00:00Z",
                end: "2026-03-13T00:00:00Z",
            },
            {
                minutes: 10,
                start: "2026-03-13T00:00:00Z",
                end: "2026-03-14T00:00:00Z",
            },
        ],
        topSongs: [
            {
                publicId: "s1",
                name: "Pet Cheetah",
                href: "/song/pet-cheetah",
                value: 3,
                imageUrl: null,
                subtitle: "Twenty One Pilots",
            },
            {
                publicId: "s2",
                name: "Doubt (demo)",
                href: "/song/doubt-demo",
                value: 2,
                imageUrl: null,
                subtitle: "Witt Lowry",
            },
            {
                publicId: "s3",
                name: "Garbage",
                href: "/song/garbage",
                value: 2,
                imageUrl: null,
                subtitle: "Twenty One Pilots",
            },
        ],
        topAlbums: [
            {
                publicId: "a1",
                name: "Trench",
                href: "/album/trench",
                value: 13,
                imageUrl: null,
                subtitle: "Twenty One Pilots",
            },
            {
                publicId: "a2",
                name: "Blurryface",
                href: "/album/blurryface",
                value: 3,
                imageUrl: null,
                subtitle: "Twenty One Pilots",
            },
        ],
        topArtists: [
            {
                publicId: "ar1",
                name: "Twenty One Pilots",
                href: "/artist/top",
                value: 7,
                imageUrl: null,
                subtitle: null,
            },
            {
                publicId: "ar2",
                name: "Witt Lowry",
                href: "/artist/witt-lowry",
                value: 4,
                imageUrl: null,
                subtitle: null,
            },
        ],
        heatmap: [
            { hour: 18, day: 0, value: 12 },
            { hour: 19, day: 0, value: 15 },
            { hour: 20, day: 0, value: 9 },
            { hour: 21, day: 1, value: 18 },
            { hour: 22, day: 1, value: 13 },
        ],
    },
    "/library": {
        albums: [],
        playlists: [],
        songs: [],
        videos: [],
        stations: [],
        shared: [],
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

export async function apiFetch<T>(
    path: string,
    schema: ZodType<T>,
    options?: RequestInit
): Promise<T>;
export async function apiFetch(
    path: string,
    options?: RequestInit
): Promise<Response>;
export async function apiFetch<T>(
    path: string,
    schemaOrOptions?: ZodType<T> | RequestInit,
    options?: RequestInit
): Promise<T | Response> {
    if (schemaOrOptions && "parse" in schemaOrOptions) {
        const schema = schemaOrOptions as ZodType<T>;
        const response = await doFetch(path, options);
        const json = await response.json();
        return schema.parse(json);
    }
    const response = await doFetch(
        path,
        schemaOrOptions as RequestInit | undefined
    );
    return response;
}

async function doFetch(
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
