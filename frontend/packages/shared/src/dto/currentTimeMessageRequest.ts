// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const CurrentTimeMessageRequestSchema = z.object({
    currentTimeMs: z.number(),
});

export type CurrentTimeMessageRequest = z.infer<
    typeof CurrentTimeMessageRequestSchema
>;
