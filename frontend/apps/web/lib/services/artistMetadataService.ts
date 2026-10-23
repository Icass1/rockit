import {
    ArtistMetadataCandidatesSchema,
    ArtistMetadataCatalogSchema,
    ArtistMetadataProfileSchema,
    type ArtistMetadataCatalog,
    type ArtistMetadataIdentity,
    type ArtistMetadataItem,
    type ArtistMetadataProfile,
    type BaseAlbumWithoutSongsResponse,
    type BaseSongWithAlbumResponse,
    type MetadataResponse,
} from "@/dto";
import type { HttpResult } from "@rockit/shared";
import type { ArtistDiscographyEntry } from "@/models/artistCatalog";
import { Http } from "@/lib/http";

// Coalesce remounts and reuse successful responses. Durable caching and the
// cross-worker rate limit still belong to the provider on the server.
const requests = new Map<
    string,
    { expires: number; promise: Promise<MetadataResponse> }
>();
let unavailableUntil = 0;
let unavailableMessage = "";

function requestMetadata(
    key: string,
    load: () => Promise<HttpResult<MetadataResponse>>
): Promise<MetadataResponse> {
    const now = Date.now();
    const cached = requests.get(key);
    if (cached && cached.expires > now) return cached.promise;
    if (now < unavailableUntil)
        return Promise.reject(new Error(unavailableMessage));
    const promise = load().then((result) => {
        if (!result.isOk()) {
            if (result.code === 429 || result.code === 503) {
                unavailableUntil = Date.now() + 60_000;
                unavailableMessage = result.message;
            }
            throw new Error(result.message);
        }
        return result.result;
    });
    const entry = { expires: now + 300_000, promise };
    requests.set(key, entry);
    if (requests.size > 100) requests.delete(requests.keys().next().value!);
    void promise.catch(() => {
        if (requests.get(key) === entry) requests.delete(key);
    });
    return promise;
}

export async function findArtistMetadata(
    name: string
): Promise<ArtistMetadataIdentity[]> {
    const normalized = normalizeArtistName(name);
    const result = await requestMetadata(`search:${normalized}`, () =>
        Http.searchArtists("MusicBrainz", normalized)
    );
    return ArtistMetadataCandidatesSchema.parse(result.data).candidates;
}

export async function getArtistMetadataProfile(
    id: string
): Promise<ArtistMetadataProfile & { stale: boolean }> {
    const result = await requestMetadata(`profile:${id}`, () =>
        Http.getMetadata("MusicBrainz", "artist-profile", id)
    );
    return {
        ...ArtistMetadataProfileSchema.parse(result.data),
        stale: result.stale,
    };
}

export async function getArtistMetadataCatalog(
    id: string,
    entity: "artist-discography" | "artist-recordings",
    offset = 0
): Promise<ArtistMetadataCatalog & { stale: boolean }> {
    const result = await requestMetadata(`${entity}:${id}:${offset}`, () =>
        Http.getMetadata("MusicBrainz", entity, id, offset)
    );
    return {
        ...ArtistMetadataCatalogSchema.parse(result.data),
        stale: result.stale,
    };
}

/** Keep punctuation and version names: similar titles alone do not identify an edition. */
export function normalizeArtistName(value: string): string {
    return value
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase();
}

export function artistSearchUrl(query: string): string {
    return `/search?q=${encodeURIComponent(query)}`;
}

export function matchArtistCatalogItem(
    item: ArtistMetadataItem,
    collection: (BaseSongWithAlbumResponse | BaseAlbumWithoutSongsResponse)[]
): BaseSongWithAlbumResponse | BaseAlbumWithoutSongsResponse | undefined {
    const matches = collection.filter((entry) => {
        if (normalizeArtistName(entry.name) !== normalizeArtistName(item.title))
            return false;
        const date =
            entry.type === "album"
                ? entry.releaseDate
                : entry.album.releaseDate;
        return (
            !item.date || !date || item.date.slice(0, 4) === date.slice(0, 4)
        );
    });
    // Ambiguous editions stay in search, rather than playing an arbitrary match.
    return matches.length === 1 ? matches[0] : undefined;
}

export function partitionArtistEvents(
    events: ArtistMetadataProfile["events"]
): {
    upcoming: ArtistMetadataProfile["events"];
    past: ArtistMetadataProfile["events"];
} {
    const today = new Date().toISOString().slice(0, 10);
    return {
        upcoming: events
            .filter((event) => event.date && event.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date)),
        past: events
            .filter((event) => event.date && event.date < today)
            .sort((a, b) => b.date.localeCompare(a.date)),
    };
}

/** Deduplicate provider identities, preserving editions with distinct IDs. */
export function mergeArtistCatalogPages(
    current: ArtistMetadataCatalog | undefined,
    next: ArtistMetadataCatalog
): ArtistMetadataItem[] {
    return [
        ...new Map(
            [
                ...(next.offset === 0 ? [] : (current?.items ?? [])),
                ...next.items,
            ].map((item) => [item.id, item])
        ).values(),
    ];
}

/** Keep local-only editions in the same chronological order as metadata. */
export function artistDiscographyEntries(
    items: ArtistMetadataItem[],
    albums: BaseAlbumWithoutSongsResponse[]
): ArtistDiscographyEntry[] {
    const represented = new Set<string>();
    const entries: ArtistDiscographyEntry[] = items.map((item) => {
        const match = matchArtistCatalogItem(item, albums);
        const album = match?.type === "album" ? match : undefined;
        if (album) represented.add(album.publicId);
        return { item, album };
    });
    for (const album of albums) {
        if (represented.has(album.publicId)) continue;
        represented.add(album.publicId);
        entries.push({
            album,
            item: {
                id: `local:${album.publicId}`,
                title: album.name,
                date: album.releaseDate,
                kind: "",
                secondaryTypes: [],
                imageUrl: album.imageUrl,
            },
        });
    }
    return entries.sort(
        (a, b) =>
            b.item.date.localeCompare(a.item.date) ||
            a.item.title.localeCompare(b.item.title) ||
            a.item.id.localeCompare(b.item.id)
    );
}
