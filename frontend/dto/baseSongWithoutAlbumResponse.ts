import { BaseArtistResponseSchema } from "@/dto";
import { z } from "zod";

export const BaseSongWithoutAlbumResponseSchema = z.object({
    type: z.union([z.literal("song")]),
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
});

export type BaseSongWithoutAlbumResponse = z.infer<
    typeof BaseSongWithoutAlbumResponseSchema
>;
