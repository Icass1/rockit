import { z } from "zod";

export const MediaEndedMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
});

export type MediaEndedMessageRequest = z.infer<
    typeof MediaEndedMessageRequestSchema
>;
