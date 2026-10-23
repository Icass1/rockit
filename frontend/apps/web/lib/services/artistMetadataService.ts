import {
    ArtistMetadataCandidatesSchema,
    ArtistMetadataCatalogSchema,
    ArtistMetadataProfileSchema,
    type ArtistMetadataCatalog,
    type ArtistMetadataIdentity,
    type ArtistMetadataProfile,
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
