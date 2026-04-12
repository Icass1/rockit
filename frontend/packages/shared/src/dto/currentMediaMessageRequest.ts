// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const CurrentMediaMessageRequestSchema = z.object({
    mediaPublicId: z.string(),
    queueMediaId: z.number(),
});

export type CurrentMediaMessageRequest = z.infer<
    typeof CurrentMediaMessageRequestSchema
>;
