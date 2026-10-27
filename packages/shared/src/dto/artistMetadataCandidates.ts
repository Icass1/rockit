// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { ArtistMetadataIdentitySchema } from "./artistMetadataIdentity";

export const ArtistMetadataCandidatesSchema = z.object({
    candidates: z.array(z.lazy(() => ArtistMetadataIdentitySchema)),
});

export type ArtistMetadataCandidates = z.infer<
    typeof ArtistMetadataCandidatesSchema
>;
