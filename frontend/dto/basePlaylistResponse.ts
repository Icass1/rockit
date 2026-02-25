import { z } from 'zod';

export const BasePlaylistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
});

export type BasePlaylistResponse = z.infer<typeof BasePlaylistResponseSchema>;