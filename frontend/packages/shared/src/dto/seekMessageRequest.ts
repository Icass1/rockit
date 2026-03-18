import { z } from "zod";

export const SeekMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
    timeFrom: z.number(),
    timeTo: z.number(),
});

export type SeekMessageRequest = z.infer<typeof SeekMessageRequestSchema>;
