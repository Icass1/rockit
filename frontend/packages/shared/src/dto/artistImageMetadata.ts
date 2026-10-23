// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ArtistImageMetadataSchema = z.object({
    imageUrl: z.string().default(""),
    sourceUrl: z.string().default(""),
    width: z.number().default(0),
    height: z.number().default(0),
});

export type ArtistImageMetadata = z.infer<typeof ArtistImageMetadataSchema>;
