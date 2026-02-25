import { z } from "zod";

export const BaseArtistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    internalImageUrl: z.string(),
    genres: z.any(),
});

export type BaseArtistResponse = z.infer<typeof BaseArtistResponseSchema>;
