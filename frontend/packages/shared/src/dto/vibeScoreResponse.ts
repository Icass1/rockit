// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const VibeScoreResponseSchema = z.object({
    score: z.number(),
    descriptor: z.string(),
    sharedArtistsCount: z.number(),
});

export type VibeScoreResponse = z.infer<typeof VibeScoreResponseSchema>;
