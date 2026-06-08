// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const CreateBookmarkRequestSchema = z.object({
    mediaPublicId: z.string(),
    timestamp: z.number(),
    description: z.string().nullable(),
    mode: z.enum(["NOTHING", "AUTOSKIP"]),
});

export type CreateBookmarkRequest = z.infer<typeof CreateBookmarkRequestSchema>;
