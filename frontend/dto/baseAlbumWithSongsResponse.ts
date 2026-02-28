import { z } from "zod";
import {
    BaseArtistResponseSchema,
    BaseSongWithoutAlbumResponseSchema,
} from "@/dto";

export const BaseAlbumWithSongsResponseSchema = z.object({
    type: z.union([z.literal("album")]),
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.array(z.lazy(() => BaseSongWithoutAlbumResponseSchema)),
});

export type BaseAlbumWithSongsResponse = z.infer<
    typeof BaseAlbumWithSongsResponseSchema
>;
