import { z } from "zod";

export const CurrentTimeMessageRequestSchema = z.object({
    currentTime: z.number(),
});

export type CurrentTimeMessageRequest = z.infer<
    typeof CurrentTimeMessageRequestSchema
>;
