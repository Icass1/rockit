import { z } from "zod";

export const SpotifyArtistResponseSchema = z.object({
    type: z.union([z.literal("artist")]).default("artist"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    genres: z.array(z.string()),
});

export type SpotifyArtistResponse = z.infer<typeof SpotifyArtistResponseSchema>;
