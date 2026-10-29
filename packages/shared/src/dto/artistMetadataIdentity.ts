// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const ArtistMetadataIdentitySchema = z.object({
    id: z.string(),
    name: z.string(),
    note: z.string(),
});

export type ArtistMetadataIdentity = z.infer<
    typeof ArtistMetadataIdentitySchema
>;
