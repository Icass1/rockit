// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateBookmarkRequestSchema = z.object({
    timestamp: z.number().nullable(),
    description: z.string().nullable(),
    mode: z.enum(["NOTHING", "AUTOSKIP"]).nullable(),
});

export type UpdateBookmarkRequest = z.infer<typeof UpdateBookmarkRequestSchema>;
