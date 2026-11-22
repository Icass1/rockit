// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LyricsWordSchema } from "./lyricsWord";

export const PlaybackLyricsLineSchema = z.object({
    text: z.string(),
    timestamp_s: z.number().nullable(),
    words: z.array(z.lazy(() => LyricsWordSchema)).default([]),
    end_timestamp_s: z.number().nullable(),
});

export type PlaybackLyricsLine = z.infer<typeof PlaybackLyricsLineSchema>;
