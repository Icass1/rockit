// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const GetLyricsBatchRequestSchema = z.object({
    publicIds: z.array(z.string()),
});

export type GetLyricsBatchRequest = z.infer<typeof GetLyricsBatchRequestSchema>;
