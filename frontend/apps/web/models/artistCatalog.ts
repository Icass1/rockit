import type {
    ArtistMetadataCatalog,
    ArtistMetadataItem,
    BaseAlbumWithoutSongsResponse,
} from "@/dto";

export type ArtistCatalogState = ArtistMetadataCatalog & {
    stale: boolean;
    hasMore: boolean;
    nextOffset: number;
};

export type ArtistDiscographyEntry = {
    item: ArtistMetadataItem;
    album?: BaseAlbumWithoutSongsResponse;
};

export type ArtistAccent = { rgb: string; foreground: string };
