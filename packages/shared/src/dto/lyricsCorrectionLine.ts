// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LyricsWordSchema } from "./lyricsWord";

export const LyricsCorrectionLineSchema = z.object({
    text: z.string(),
    timestamp_s: z.number().nullable().default(null),
    words: z
        .array(z.lazy(() => LyricsWordSchema))
        .nullable()
        .default(null),
    end_timestamp_s: z.number().nullable().default(null),
});

export type LyricsCorrectionLine = z.infer<typeof LyricsCorrectionLineSchema>;
