import { z } from "zod";

export const SkipClickedMessageRequestSchema = z.object({
    direction: z.string(),
    mediaPublicId: z.string(),
});

export type SkipClickedMessageRequest = z.infer<
    typeof SkipClickedMessageRequestSchema
>;
