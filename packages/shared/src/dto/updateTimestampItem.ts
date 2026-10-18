// This file is generated using: python3 -m backend models
// Do not modify this file manually.

import { z } from "zod";

export const UpdateTimestampItemSchema = z.object({
    line: z.number(),
    timestamp_s: z.number(),
});

export type UpdateTimestampItem = z.infer<typeof UpdateTimestampItemSchema>;
