// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const ArtistMetadataItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    date: z.string().default(""),
    kind: z.string().default(""),
    imageUrl: z.string().default(""),
});

export type ArtistMetadataItem = z.infer<typeof ArtistMetadataItemSchema>;
