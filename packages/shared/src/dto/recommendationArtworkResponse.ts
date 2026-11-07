// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const RecommendationArtworkResponseSchema = z.object({
    imageUrl: z.string().nullable(),
});

export type RecommendationArtworkResponse = z.infer<
    typeof RecommendationArtworkResponseSchema
>;
