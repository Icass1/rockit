import { z } from "zod";

export const BaseAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.any(),
});

export type BaseAlbumResponse = z.infer<typeof BaseAlbumResponseSchema>;
