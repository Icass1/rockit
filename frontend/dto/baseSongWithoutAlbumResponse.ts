import { z } from "zod";
import { BaseArtistResponseSchema } from "@/dto";

export const BaseSongWithoutAlbumResponseSchema = z.object({
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
});

export type BaseSongWithoutAlbumResponse = z.infer<
    typeof BaseSongWithoutAlbumResponseSchema
>;
