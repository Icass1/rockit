// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LyricsWordSchema } from "./lyricsWord";

export const DynamicLyricsItemSchema = z.object({
    text: z.string(),
    timestamp_s: z.number(),
    words: z.array(z.lazy(() => LyricsWordSchema)).default([]),
    end_timestamp_s: z.number().nullable().default(null),
});

export type DynamicLyricsItem = z.infer<typeof DynamicLyricsItemSchema>;
