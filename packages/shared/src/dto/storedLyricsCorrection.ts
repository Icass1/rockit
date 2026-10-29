// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LyricsCorrectionLineSchema } from "./lyricsCorrectionLine";

export const StoredLyricsCorrectionSchema = z.object({
    kind: z
        .union([z.literal("lyrics_correction")])
        .default("lyrics_correction"),
    provider: z.string(),
    revision: z.string(),
    offset: z.number(),
    lines: z.array(z.lazy(() => LyricsCorrectionLineSchema)).nullable(),
    sourceHash: z.string(),
    audioIdentity: z.string(),
});

export type StoredLyricsCorrection = z.infer<
    typeof StoredLyricsCorrectionSchema
>;
