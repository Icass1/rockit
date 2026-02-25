import { z } from 'zod';

export const BaseAlbumSongResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    audioSrc: z.any(),
    downloaded: z.boolean(),
    internalImageUrl: z.string(),
});

export type BaseAlbumSongResponse = z.infer<typeof BaseAlbumSongResponseSchema>;