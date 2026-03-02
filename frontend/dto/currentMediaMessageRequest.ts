import { z } from "zod";

export const CurrentMediaMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
    queueIndex: z.number(),
});

export type CurrentMediaMessageRequest = z.infer<
    typeof CurrentMediaMessageRequestSchema
>;
