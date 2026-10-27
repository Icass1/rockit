// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { ArtistMetadataItemSchema } from "./artistMetadataItem";

export const ArtistMetadataCatalogSchema = z.object({
    items: z.array(z.lazy(() => ArtistMetadataItemSchema)),
    total: z.number(),
    offset: z.number(),
});

export type ArtistMetadataCatalog = z.infer<typeof ArtistMetadataCatalogSchema>;
