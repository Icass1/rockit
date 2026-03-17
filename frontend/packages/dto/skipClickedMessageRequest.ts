import { z } from "zod";

export const SkipClickedMessageRequestSchema = z.object({
    direction: z.any(),
    mediaPublicId: z.string(),
});

export type SkipClickedMessageRequest = z.infer<
    typeof SkipClickedMessageRequestSchema
>;
