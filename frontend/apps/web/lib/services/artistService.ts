import { type ArtistPageResponse, type BaseSongWithAlbumResponse } from "@/dto";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";

export async function getArtistPageAsync(
    publicId?: string,
    name?: string,
    offset = 0
): Promise<ArtistPageResponse | undefined> {
    const path = publicId
        ? `/media/artist/${encodeURIComponent(publicId)}/page?offset=${offset}`
        : `/media/artists/profile?name=${encodeURIComponent(name ?? "")}&offset=${offset}`;
    return Http.getArtistPage(path);
}

export function playArtistSongs(
    songs: BaseSongWithAlbumResponse[],
    selected?: string
): void {
    const playable = songs.filter((song) => song.downloaded && song.audioUrl);
    if (!playable.length) return;
    rockIt.queueManager.setCurrentList(undefined);
    rockIt.queueManager.setMedia(playable, "");
    rockIt.queueManager.moveToMedia(selected ?? playable[0].publicId);
    rockIt.mediaPlayerManager.play();
}

export function normalizeArtistPageName(name: string): string {
    return name.normalize("NFC").replace(/\s+/g, " ").trim();
}

// Decode encoded route segments at the page boundary, never in provider
// matching or on names supplied directly by search results.
export function artistNameFromRoute(segment: string): string {
    try {
        return normalizeArtistPageName(decodeURIComponent(segment));
    } catch {
        return normalizeArtistPageName(segment);
    }
}

export function artistPageUrl(name: string): string {
    return `/artists/${encodeURIComponent(normalizeArtistPageName(name).toLowerCase())}`;
}

const artistPortraits = new Map<string, string>();
const portraitListeners = new Set<() => void>();
const PORTRAITS_KEY = "rockit.artist-portraits";

export function rememberArtistPortrait(name: string, imageUrl: string): void {
    if (!imageUrl) return;
    const key = name
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase();
    artistPortraits.delete(key);
    artistPortraits.set(key, imageUrl);
    if (artistPortraits.size > 50)
        artistPortraits.delete(artistPortraits.keys().next().value!);
    if (typeof window !== "undefined") {
        try {
            window.sessionStorage.setItem(
                PORTRAITS_KEY,
                JSON.stringify(Object.fromEntries(artistPortraits))
            );
        } catch {
            /* Navigation still works when browser storage is unavailable. */
        }
    }
    portraitListeners.forEach((listener) => listener());
}

export function getArtistPortrait(name: string): string {
    const key = name
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase();
    const portrait = artistPortraits.get(key);
    if (portrait) return portrait;
    if (typeof window !== "undefined") {
        try {
            const stored: unknown = JSON.parse(
                window.sessionStorage.getItem(PORTRAITS_KEY) ?? "{}"
            );
            if (stored && typeof stored === "object" && key in stored) {
                const image: unknown = (stored as Record<string, unknown>)[key];
                if (typeof image === "string") return image;
            }
        } catch {
            /* No saved portrait is required to open an artist. */
        }
    }
    return "";
}

export function subscribeArtistPortrait(listener: () => void): () => void {
    portraitListeners.add(listener);
    return (): void => {
        portraitListeners.delete(listener);
    };
}

export function getServerArtistPortrait(): string {
    return "";
}
