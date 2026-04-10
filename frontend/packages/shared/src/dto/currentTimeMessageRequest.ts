import { z } from "zod";

export const CurrentTimeMessageRequestSchema = z.object({
    currentTimeMs: z.number(),
});

export type CurrentTimeMessageRequest = z.infer<
    typeof CurrentTimeMessageRequestSchema
>;
