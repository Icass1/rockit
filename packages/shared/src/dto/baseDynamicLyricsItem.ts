// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LyricsWordSchema } from "./lyricsWord";

export const BaseDynamicLyricsItemSchema = z.object({
    text: z.string(),
    timestamp_s: z.number(),
    words: z.array(z.lazy(() => LyricsWordSchema)).default([]),
    end_timestamp_s: z.number().nullable(),
});

export type BaseDynamicLyricsItem = z.infer<typeof BaseDynamicLyricsItemSchema>;
