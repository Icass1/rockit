// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SpotifyScrapperArtistResponseSchema = z.object({
    type: z.union([z.literal("artist")]).default("artist"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
    genres: z.array(z.string()),
});

export type SpotifyScrapperArtistResponse = z.infer<
    typeof SpotifyScrapperArtistResponseSchema
>;
