import { type ArtistPageResponse, type BaseSongWithAlbumResponse } from "@/dto";
import type { BaseAlbumWithoutSongsResponse } from "@/dto";
import type { ArtistAccent } from "@/models/artistCatalog";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { parseDominantColor } from "@/components/Home/hooks/useDominantColor";

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

export function artistPageUrl(name: string, url?: string | null): string {
    if (url && /^\/artist\/[^/?#]+$/.test(url)) return url;
    return `/artists/${encodeURIComponent(normalizeArtistPageName(name).toLowerCase())}`;
}

const artistPortraits = new Map<string, string>();
const portraitListeners = new Set<() => void>();
const PORTRAITS_KEY = "rockit.artist-portraits.v2";

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

export async function resolveArtistPageUrl(
    name: string,
    providerUrl: string,
    url?: string | null
): Promise<string> {
    const fallback = artistPageUrl(name, url);
    if (fallback.startsWith("/artist/") || !providerUrl) return fallback;
    const result = await Http.addFromUrlAsync({
        url: providerUrl,
        addToLibrary: false,
        addToPlaylist: false,
        playlistPublicId: null,
    });
    if (!result.isOk() || result.result.data.type !== "artist") return fallback;
    return artistPageUrl(name, result.result.data.url);
}

/** Reuse stored dominant colors; never sample cross-origin artwork in the browser. */
export function artistAccent(
    color: string,
    albums: BaseAlbumWithoutSongsResponse[]
): ArtistAccent | undefined {
    const candidates = [
        color,
        ...[...albums]
            .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
            .map((album) => album.dominantColor),
    ];
    const valid = candidates.find((value) => /^#[0-9a-f]{6}$/i.test(value));
    if (!valid) return undefined;
    const { r, g, b } = parseDominantColor(valid);
    const linear = (value: number): number =>
        value / 255 <= 0.04045
            ? value / 255 / 12.92
            : ((value / 255 + 0.055) / 1.055) ** 2.4;
    const luminance =
        0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    return {
        rgb: `${r}, ${g}, ${b}`,
        foreground:
            (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05)
                ? "#000000"
                : "#ffffff",
    };
}
