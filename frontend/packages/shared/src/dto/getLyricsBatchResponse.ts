// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";
import { GetLyricsResponseSchema } from "./getLyricsResponse";

export const GetLyricsBatchResponseSchema = z.object({
    lyrics: z.record(
        z.string(),
        z.lazy(() => GetLyricsResponseSchema)
    ),
});

export type GetLyricsBatchResponse = z.infer<
    typeof GetLyricsBatchResponseSchema
>;
