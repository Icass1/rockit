// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const MetadataResponseSchema = z.object({
    provider: z.string(),
    entity: z.string(),
    externalId: z.string().nullable(),
    data: z.record(z.string(), z.any()),
    cached: z.boolean(),
    fetchedAt: z.string(),
    stale: z.boolean().default(false),
});

export type MetadataResponse = z.infer<typeof MetadataResponseSchema>;
