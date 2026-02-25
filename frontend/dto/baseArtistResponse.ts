import { z } from "zod";

export const BaseArtistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    name: z.string(),
    internalImageUrl: z.string(),
    genres: z.array(z.string()),
});

export type BaseArtistResponse = z.infer<typeof BaseArtistResponseSchema>;
