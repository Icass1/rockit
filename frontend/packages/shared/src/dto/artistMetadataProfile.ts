// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { ArtistMetadataIdentitySchema } from "./artistMetadataIdentity";
import { ArtistMetadataItemSchema } from "./artistMetadataItem";

export const ArtistMetadataProfileSchema = z.object({
    name: z.string(),
    description: z.string(),
    genres: z.array(z.string()),
    related: z.array(z.lazy(() => ArtistMetadataIdentitySchema)),
    events: z.array(z.lazy(() => ArtistMetadataItemSchema)),
});

export type ArtistMetadataProfile = z.infer<typeof ArtistMetadataProfileSchema>;
