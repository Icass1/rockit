// This file is generated using: python3 -m apps.backend models
// Do not modify this file manually.

import { z } from "zod";
import { LyricsCorrectionLineSchema } from "./lyricsCorrectionLine";

export const LyricsCorrectionContextResponseSchema = z.object({
    provider: z.string(),
    publicId: z.string(),
    revision: z.string().nullable(),
    offset: z.number(),
    lines: z.array(z.lazy(() => LyricsCorrectionLineSchema)),
    syncStatus: z.union([z.literal("provider"), z.literal("approved")]),
});

export type LyricsCorrectionContextResponse = z.infer<
    typeof LyricsCorrectionContextResponseSchema
>;
