import { z } from "zod";

export const AlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
    songs: z.any(),
    spotifyId: z.string(),
    externalImages: z.any(),
});

export type AlbumResponse = z.infer<typeof AlbumResponseSchema>;
