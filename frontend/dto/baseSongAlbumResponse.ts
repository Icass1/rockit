import { z } from 'zod';

export const BaseSongAlbumResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    artists: z.any(),
    releaseDate: z.string(),
    internalImageUrl: z.string(),
});

export type BaseSongAlbumResponse = z.infer<typeof BaseSongAlbumResponseSchema>;