// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const SearchProviderRequestSchema = z.object({
    query: z.string(),
    providerId: z.string(),
    limit: z.number().default(15),
    mediaType: z
        .union([
            z.literal("song"),
            z.literal("album"),
            z.literal("artist"),
            z.literal("playlist"),
            z.literal("video"),
            z.literal("radio"),
        ])
        .nullable(),
});

export type SearchProviderRequest = z.infer<typeof SearchProviderRequestSchema>;
