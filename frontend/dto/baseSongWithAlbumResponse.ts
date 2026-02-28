import { z } from "zod";
import {
    BaseAlbumWithoutSongsResponseSchema,
    BaseArtistResponseSchema,
} from "@/dto";

export const BaseSongWithAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.array(z.lazy(() => BaseArtistResponseSchema)),
    audioSrc: z.string().nullable(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
    duration: z.number(),
    discNumber: z.number(),
    trackNumber: z.number(),
    album: z.lazy(() => BaseAlbumWithoutSongsResponseSchema),
});

export type BaseSongWithAlbumResponse = z.infer<
    typeof BaseSongWithAlbumResponseSchema
>;
