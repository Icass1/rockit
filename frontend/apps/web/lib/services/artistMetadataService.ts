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
} from "@/dto";
import { Http } from "@/lib/http";

export async function findArtistMetadata(
    name: string
): Promise<ArtistMetadataIdentity[]> {
    const result = await Http.searchArtists("MusicBrainz", name);
    if (!result.isOk()) throw new Error(result.message);
    return ArtistMetadataCandidatesSchema.parse(result.result.data).candidates;
}

export async function getArtistMetadataProfile(
    id: string
): Promise<ArtistMetadataProfile & { stale: boolean }> {
    const result = await Http.getMetadata("MusicBrainz", "artist-profile", id);
    if (!result.isOk()) throw new Error(result.message);
    return {
        ...ArtistMetadataProfileSchema.parse(result.result.data),
        stale: result.result.stale,
    };
}

export async function getArtistMetadataCatalog(
    id: string,
    entity: "artist-discography" | "artist-recordings",
    offset = 0
): Promise<ArtistMetadataCatalog & { stale: boolean }> {
    const result = await Http.getMetadata("MusicBrainz", entity, id, offset);
    if (!result.isOk()) throw new Error(result.message);
    return {
        ...ArtistMetadataCatalogSchema.parse(result.result.data),
        stale: result.result.stale,
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
