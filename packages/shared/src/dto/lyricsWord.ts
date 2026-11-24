// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";

export const LyricsWordSchema = z.object({
    text: z.string(),
    timestamp_s: z.number(),
    end_timestamp_s: z.number().nullable().default(null),
});

export type LyricsWord = z.infer<typeof LyricsWordSchema>;
