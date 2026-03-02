import { z } from "zod";

export const SeekMessageRequestSchema = z.object({
    timeFrom: z.number(),
    timeTo: z.number(),
});

export type SeekMessageRequest = z.infer<typeof SeekMessageRequestSchema>;
