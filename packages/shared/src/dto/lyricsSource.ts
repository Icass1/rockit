// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const LyricsSourceSchema = z.object({
    kind: z.union([z.literal("lyrics_source")]),
    provider: z.union([z.literal("LRCLIB")]),
    sourceId: z.number(),
});

export type LyricsSource = z.infer<typeof LyricsSourceSchema>;
