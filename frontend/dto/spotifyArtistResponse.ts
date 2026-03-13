import { z } from "zod";

export const SpotifyArtistResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    genres: z.array(z.string()),
});

export type SpotifyArtistResponse = z.infer<typeof SpotifyArtistResponseSchema>;
