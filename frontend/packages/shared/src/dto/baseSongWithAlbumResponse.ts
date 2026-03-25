import { z } from "zod";
import { BaseAlbumWithoutSongsResponseSchema } from "./baseAlbumWithoutSongsResponse";
import { BaseArtistResponseSchema } from "./baseArtistResponse";

export const BaseSongWithAlbumResponseSchema = z.object({
    type: z.union([z.literal("song")]).default("song"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.string().nullable(),
    downloaded: z.boolean(),
    imageUrl: z.string(),
    duration: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
    album: z.lazy(() => BaseAlbumWithoutSongsResponseSchema),
});

export type BaseSongWithAlbumResponse = z.infer<
    typeof BaseSongWithAlbumResponseSchema
>;
