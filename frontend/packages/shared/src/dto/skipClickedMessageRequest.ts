// This file is generated using: python3 -m backend zod
// Do not modify this file manually.

import { z } from "zod";

export const SkipClickedMessageRequestSchema = z.object({
    direction: z.enum(["NEXT", "PREVIOUS"]),
    mediaPublicId: z.string(),
});

export type SkipClickedMessageRequest = z.infer<
    typeof SkipClickedMessageRequestSchema
>;
