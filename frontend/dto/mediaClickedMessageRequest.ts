import { z } from "zod";

export const MediaClickedMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
});

export type MediaClickedMessageRequest = z.infer<
    typeof MediaClickedMessageRequestSchema
>;
