// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const BaseArtistResponseSchema = z.object({
    type: z.union([z.literal("artist")]).default("artist"),
    provider: z.string(),
    publicId: z.string(),
    url: z.string(),
    providerUrl: z.string(),
    name: z.string(),
    imageUrl: z.string(),
});

export type BaseArtistResponse = z.infer<typeof BaseArtistResponseSchema>;
