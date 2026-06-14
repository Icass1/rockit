// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const VibeResultSchema = z.object({
    score: z.number(),
    descriptor: z.string(),
    sharedArtistsCount: z.number(),
});

export type VibeResult = z.infer<typeof VibeResultSchema>;
