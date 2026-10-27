// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ArtistCatalogResponseSchema = z.object({
    songIds: z.array(z.string()).default([]),
    albumIds: z.array(z.string()).default([]),
    ambiguous: z.boolean().default(false),
});

export type ArtistCatalogResponse = z.infer<typeof ArtistCatalogResponseSchema>;
